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
const REDIS_TIMEOUT_MS = 2000;
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
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL no configurado. Rate limit en memoria (inútil en serverless).",
      );
    }
    return null;
  }

  const redisFetch = async (path: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);
    try {
      const res = await fetch(`${url}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
      return res;
    } finally {
      clearTimeout(timeout);
    }
  };

  redisClient = {
    async incr(key: string) {
      const res = await redisFetch(`/incr/${encodeURIComponent(key)}`);
      const data = (await res.json()) as { result?: number };
      if (typeof data.result !== "number")
        throw new Error("Redis returned an invalid counter");
      return data.result;
    },
    async pexpire(key: string, ms: number) {
      await redisFetch(`/pexpire/${encodeURIComponent(key)}/${ms}`);
    },
  };

  return redisClient;
}

export async function checkRateLimitAsync(
  ip: string,
  namespace = "global",
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) {
    return checkRateLimit(ip, namespace);
  }

  try {
    // Clave fija por IP: el TTL se renueva en cada llamada, así que la ventana
    // se ancla a la primera petición (sin el doble cupo del borde de minuto de
    // una clave por bucket) y una clave sin TTL se repara en la petición
    // siguiente en vez de dejar al usuario en 429 para siempre.
    const key = namespace === "global" ? `rl:${ip}` : `rl:${namespace}:${ip}`;
    const count = await redis.incr(key);
    await redis.pexpire(key, RATE_WINDOW);

    return count <= RATE_LIMIT;
  } catch {
    return checkRateLimit(ip, namespace);
  }
}

export function checkRateLimit(ip: string, namespace = "global"): boolean {
  const now = Date.now();
  const key = namespace === "global" ? ip : `${namespace}:${ip}`;
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    if (rateLimitMap.size >= MAX_ENTRIES) {
      prune();
    }
    insertsSincePrune++;
    if (insertsSincePrune >= PRUNE_THRESHOLD) {
      prune();
      insertsSincePrune = 0;
    }
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  record.count++;
  return true;
}
