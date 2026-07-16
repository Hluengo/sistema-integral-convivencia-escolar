/** @license SPDX-License-Identifier: Apache-2.0 */

import { createClient } from '@supabase/supabase-js';

let cachedClient: ReturnType<typeof createClient> | null = null;
let cachedKey = '';

export function getEnvUrl(): string {
  return (import.meta as any).env?.VITE_SUPABASE_URL as string;
}

export function getEnvAnonKey(): string {
  return (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;
}

export function isLocalDemoAllowed(): boolean {
  return (import.meta as any).env?.VITE_ALLOW_LOCAL_DEMO === 'true';
}

export function getBrowserSupabase() {
  const url = getEnvUrl();
  const anonKey = getEnvAnonKey();
  if (!url || !anonKey) return null;

  const key = `${url}:${anonKey}`;
  if (cachedClient && cachedKey === key) return cachedClient;

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  cachedKey = key;
  return cachedClient;
}
