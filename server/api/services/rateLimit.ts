/** @license SPDX-License-Identifier: Apache-2.0 */

/**
 * Rate limiter con soporte para Upstash Redis en producción.
 *
 * En desarrollo usa un Map en memoria.
 * En producción, si UPSTASH_REDIS_REST_URL está configurado,
 * usa Upstash Redis para rate limiting persistente entre instancias.
 *
 * Si no hay Redis configurado, emite warning y usa memoria como fallback.
 */

const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;
const MAX_ENTRIES = 10000;
const PRUNE_THRESHOLD = 5000;
let insertsSincePrune = 0;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function prune() {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
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
        '[rate-limit] UPSTASH_REDIS_REST_URL no configurado. Rate limit en memoria (inútil en serverless).'
      );
    }
    return null;
  }

  redisClient = {
    async incr(key: string) {
      const res = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { result?: number };
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

export async function checkRateLimitAsync(ip: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return checkRateLimit(ip);
  }

  try {
    const key = `rl:${ip}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.pexpire(key, RATE_WINDOW);
    }

    return count <= RATE_LIMIT;
  } catch {
    return checkRateLimit(ip);
  }
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    if (rateLimitMap.size >= MAX_ENTRIES) {
      prune();
    }
    insertsSincePrune++;
    if (insertsSincePrune >= PRUNE_THRESHOLD) {
      prune();
      insertsSincePrune = 0;
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  record.count++;
  return true;
}
