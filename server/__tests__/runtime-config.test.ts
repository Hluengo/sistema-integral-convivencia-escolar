import test from "node:test";
import assert from "node:assert/strict";
import { ensureRuntimeConfig } from "../config/runtime.js";

const REQUIRED = {
  NODE_ENV: "production",
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "public-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
};

function withEnv(env: Record<string, string | undefined>, run: () => void) {
  const saved = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("arranca en producción sin Upstash y solo advierte", () => {
  withEnv(
    {
      ...REQUIRED,
      UPSTASH_REDIS_REST_URL: undefined,
      UPSTASH_REDIS_REST_TOKEN: undefined,
    },
    () => assert.doesNotThrow(() => ensureRuntimeConfig()),
  );
});

test("sigue abortando en producción si falta Supabase", () => {
  withEnv({ ...REQUIRED, SUPABASE_SERVICE_ROLE_KEY: undefined }, () =>
    assert.throws(() => ensureRuntimeConfig(), /SUPABASE_SERVICE_ROLE_KEY/),
  );
});
