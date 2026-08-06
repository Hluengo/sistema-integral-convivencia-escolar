/** @license SPDX-License-Identifier: Apache-2.0 */

/**
 * Rate limiter con soporte para Upstash Redis en producción.
 *
 * En desarrollo usa un Map en memoria (token-bucket).
 * En producción, si UPSTASH_REDIS_REST_URL está configurado,
 * usa Upstash Redis para rate limiting persistente entre instancias.
 *
 * Si no hay Redis configurado, emite warning y usa memoria como fallback.
 */

const RATE_LIMIT = 10; // capacity (tokens)
const RATE_WINDOW = 60 * 1000; // ms to fully refill the bucket
const MAX_ENTRIES = 10000;
const PRUNE_THRESHOLD = 5000;
let insertsSincePrune = 0;

// Token bucket in-memory: store tokens and last refill timestamp
const bucketMap = new Map<string, { tokens: number; lastRefill: number; capacity: number }>();

function prune() {
  const now = Date.now();
  for (const [key, val] of bucketMap) {
    // if bucket hasn't been used for 2 * RATE_WINDOW, delete it
    if (now - val.lastRefill > RATE_WINDOW * 2) bucketMap.delete(key);
  }
}

let redisClient: {
  incr: (key: string) => Promise<number>;
  pexpire: (key: string, ms: number) => Promise<void>;
} | null = null;

function getRedisClient() {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[rate-limit] UPSTASH_REDIS_REST_URL no configurado. Rate limit en memoria (inútil en serverless).',
      );
    }
    return null;
  }

  redisClient = {
    async incr(key: string) {
      const res = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { result?: number };
      return data.result ?? 0;
    },
    async pexpire(key: string, ms: number) {
      await fetch(`${url}/pexpire/${encodeURIComponent(key)}/${ms}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  };

  return redisClient;
}

// Refill rate per ms for token bucket
const REFILL_RATE_PER_MS = RATE_LIMIT / RATE_WINDOW;

export async function checkRateLimitAsync(
  ip: string,
): Promise<{ allowed: boolean; limit: number; remaining: number; resetAt: number }> {
  const redis = getRedisClient();
  if (!redis) {
    return checkRateLimit(ip);
  }

  try {
    // Keep existing Redis simple fixed-window behavior for consistency across instances.
    const key = `rl:${ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.pexpire(key, RATE_WINDOW);
    }

    const allowed = count <= RATE_LIMIT;
    const remaining = Math.max(0, RATE_LIMIT - count);
    const resetAt = Date.now() + RATE_WINDOW;
    return { allowed, limit: RATE_LIMIT, remaining, resetAt };
  } catch {
    return checkRateLimit(ip);
  }
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let bucket = bucketMap.get(ip);

  if (!bucket) {
    // initialize full bucket but consume one token for the current request
    bucket = { tokens: RATE_LIMIT - 1, lastRefill: now, capacity: RATE_LIMIT };
    if (bucketMap.size >= MAX_ENTRIES) prune();
    insertsSincePrune++;
    if (insertsSincePrune >= PRUNE_THRESHOLD) {
      prune();
      insertsSincePrune = 0;
    }
    bucketMap.set(ip, bucket);
    return {
      allowed: true,
      limit: RATE_LIMIT,
      remaining: bucket.tokens,
      resetAt: now + RATE_WINDOW,
    };
  }

  // refill based on elapsed time since lastRefill
  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const refill = elapsed * REFILL_RATE_PER_MS;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    const remaining = Math.floor(bucket.tokens);
    return { allowed: true, limit: RATE_LIMIT, remaining, resetAt: now + RATE_WINDOW };
  }

  // compute resetAt as when tokens will reach 1 again
  const msUntilOneToken = Math.ceil((1 - bucket.tokens) / REFILL_RATE_PER_MS);
  return { allowed: false, limit: RATE_LIMIT, remaining: 0, resetAt: now + msUntilOneToken };
}
