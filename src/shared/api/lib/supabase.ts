/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const nodeEnv = typeof process !== "undefined" ? process.env : {};
const viteEnv = import.meta.env ?? {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL ?? nodeEnv.VITE_SUPABASE_URL;
const supabaseAnonKey =
  viteEnv.VITE_SUPABASE_ANON_KEY ??
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ??
  nodeEnv.VITE_SUPABASE_ANON_KEY ??
  nodeEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
const authStorageKey =
  viteEnv.VITE_SUPABASE_AUTH_STORAGE_KEY ??
  nodeEnv.VITE_SUPABASE_AUTH_STORAGE_KEY ??
  "convivencia-auth-token";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[AI Studio] Supabase no configurado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). " +
      "Ejecutando en modo stub sin conexión.",
  );
}

const offlineSupabaseFetch: typeof fetch = async () =>
  new Response(
    JSON.stringify({
      error: "supabase_not_configured",
      error_description:
        "Supabase no está configurado en este entorno. Configure VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.",
      message:
        "Supabase no está configurado en este entorno. Configure VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.",
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" },
    },
  );

export const supabase = createClient<Database>(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      storageKey: authStorageKey,
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
    ...(isSupabaseConfigured
      ? {}
      : { global: { fetch: offlineSupabaseFetch } }),
  },
);
