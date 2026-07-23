/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY o VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Créalas en el archivo .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Re-exported helpers for supabaseClient.ts compatibility
export function getEnvUrl(): string {
  return supabaseUrl || '';
}

export function getEnvAnonKey(): string {
  return supabaseAnonKey || '';
}

export function isLocalDemoAllowed(): boolean {
  const m = import.meta.env as Record<string, string | undefined>;
  return m?.VITE_ALLOW_LOCAL_DEMO === 'true';
}

let browserClient: typeof supabase | null = null;

export function getBrowserSupabase(): typeof supabase | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (browserClient) return browserClient;
  browserClient = supabase;
  return browserClient;
}
