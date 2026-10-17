/** @license SPDX-License-Identifier: Apache-2.0 */

export function ensureJwtConfig(): void {
  if (process.env.NODE_ENV !== "production") return;
  const hasLegacy = Boolean(process.env.SUPABASE_JWT_SECRET?.trim());
  const hasSupabase = Boolean(process.env.VITE_SUPABASE_URL?.trim());
  if (!hasLegacy && !hasSupabase) {
    throw new Error(
      "Missing SUPABASE_JWT_SECRET and VITE_SUPABASE_URL (no JWKS). Aborting startup to avoid running with degraded JWT verification.",
    );
  }
  if (!hasLegacy) {
    console.warn(
      "[jwt] SUPABASE_JWT_SECRET no configurado: se usará JWKS y fallback a Supabase API.",
    );
  }
}

export function ensureRuntimeConfig(): void {
  if (process.env.NODE_ENV !== "production") return;
  const missing: string[] = [];
  if (!process.env.VITE_SUPABASE_URL?.trim()) missing.push("VITE_SUPABASE_URL");
  if (
    !(
      process.env.VITE_SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    )?.trim()
  ) {
    missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${missing.join(", ")}. Aborting startup.`,
    );
  }
  if (!process.env.UPSTASH_REDIS_REST_URL?.trim()) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL no configurado: el fallback en memoria no aplica entre instancias.",
    );
  }
  ensureJwtConfig();
}
