/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkRateLimit, checkRateLimitAsync } from "./rateLimit.js";

describe("checkRateLimit (sync)", () => {
  it("allows first request", () => {
    const result = checkRateLimit("test-ip-1");
    assert.equal(result, true);
  });

  it("allows up to 10 requests per minute", () => {
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit("test-ip-limit");
      assert.equal(result, true);
    }
  });

  it("blocks 11th request within same window", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("test-ip-block");
    }
    const result = checkRateLimit("test-ip-block");
    assert.equal(result, false);
  });
});

describe("checkRateLimitAsync", () => {
  it("allows first request", async () => {
    const result = await checkRateLimitAsync("test-async-1");
    assert.equal(result, true);
  });

  it("allows up to 10 requests per minute", async () => {
    for (let i = 0; i < 10; i++) {
      const result = await checkRateLimitAsync("test-async-limit");
      assert.equal(result, true);
    }
  });

  it("blocks 11th request within same window", async () => {
    for (let i = 0; i < 10; i++) {
      await checkRateLimitAsync("test-async-block");
    }
    const result = await checkRateLimitAsync("test-async-block");
    assert.equal(result, false);
  });

  it("falls back to sync when no Redis configured", async () => {
    const result = await checkRateLimitAsync("test-async-fallback");
    assert.equal(typeof result, "boolean");
  });
});

describe("checkRateLimitAsync con Redis", () => {
  it("usa una clave fija por IP, renueva el TTL en cada request y no da doble cupo", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token-de-prueba";
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    let counter = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/incr/")) counter += 1;
      return {
        ok: true,
        json: async () => ({ result: counter }),
      };
    }) as typeof fetch;

    try {
      for (let i = 0; i < 10; i++) {
        assert.equal(await checkRateLimitAsync("ip-redis-ttl"), true);
      }
      // El cupo es por IP, no por bucket de minuto: la petición 11 se bloquea
      // aunque el reloj haya cruzado el minuto.
      assert.equal(await checkRateLimitAsync("ip-redis-ttl"), false);

      // Un TTL en cada llamada repara una clave que quedó sin expiración.
      assert.equal(calls.filter((url) => url.includes("/pexpire/")).length, 11);
      assert.equal(
        new Set(calls.filter((url) => url.includes("/incr/"))).size,
        1,
      );
      assert.match(calls[0] ?? "", /\/incr\/rl%3Aip-redis-ttl$/);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
  });
});
