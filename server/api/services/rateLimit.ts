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
const bucketMap = new Map<
  string,
  { tokens: number; lastRefill: number; capacity: number }
>();

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
  tokenBucket?: (
    key: string,
    capacity: number,
    refillRatePerMs: number,
    now: number,
  ) => Promise<{ allowed: boolean; remaining: number; resetAt: number } | null>;
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

  // Provide simple fixed-window ops plus a tokenBucket evaluator using EVAL (atomic) when available.
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
    async tokenBucket(key: string, capacity: number, refillRatePerMs: number, now: number) {
      // Lua script to implement token-bucket atomically in Redis.
      const script = `local key=KEYS[1]\nlocal capacity=tonumber(ARGV[1])\nlocal refill=tonumber(ARGV[2])\nlocal now=tonumber(ARGV[3])\nlocal window=tonumber(ARGV[4])\nlocal val = redis.call('GET', key)\nif not val then\n  local tokens = capacity - 1\n  redis.call('SET', key, tokens..':'..now)\n  redis.call('PEXPIRE', key, window)\n  return {1, capacity, tokens, now + window}\nend\nlocal sep = string.find(val, ':')\nlocal tokens = tonumber(string.sub(val,1,sep-1))\nlocal last = tonumber(string.sub(val,sep+1))\nlocal elapsed = now - last\nlocal refillAmount = elapsed * refill\ntokens = math.min(capacity, tokens + refillAmount)\nif tokens >= 1 then\n  tokens = tokens - 1\n  redis.call('SET', key, tokens..':'..now)\n  redis.call('PEXPIRE', key, window)\n  return {1, capacity, math.floor(tokens), now + window}\nelse\n  local msUntil = math.ceil((1 - tokens) / refill)\n  return {0, capacity, 0, now + msUntil}\nend`;

      try {
        const res = await fetch(`${url}/eval`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ script, keys: [key], args: [String(capacity), String(refillRatePerMs), String(now), String(RATE_WINDOW)] }),
        });
        const data = await res.json();
        // Upstash commonly returns { result: [...] }
        const arr = data?.result ?? data?.res ?? data?.reply ?? null;
        if (Array.isArray(arr)) {
          const allowed = Boolean(arr[0]);
          const remaining = Number(arr[2] ?? 0);
          const resetAt = Number(arr[3] ?? (now + RATE_WINDOW));
          return { allowed, remaining, resetAt };
        }
        return null;
      } catch (e) {
        return null;
      }
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
    const key = `rl:${ip}`;
    const now = Date.now();

    // Prefer atomic token-bucket in Redis when available
    const tokenRes = await redis.tokenBucket?.(key, RATE_LIMIT, REFILL_RATE_PER_MS, now);
    if (tokenRes) {
      return { allowed: tokenRes.allowed, limit: RATE_LIMIT, remaining: tokenRes.remaining, resetAt: tokenRes.resetAt };
    }

    // Fallback to simple fixed-window increment
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
    return { allowed: true, limit: RATE_LIMIT, remaining: bucket.tokens, resetAt: now + RATE_WINDOW };
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

  // For compatibility with existing middleware tests and headers, when a burst exhausts the quota
  // keep a conservative reset window equal to RATE_WINDOW. This preserves the previous
  // fixed-window Retry-After behavior while still using token-bucket for allowance.
  return { allowed: false, limit: RATE_LIMIT, remaining: 0, resetAt: now + RATE_WINDOW };
}
