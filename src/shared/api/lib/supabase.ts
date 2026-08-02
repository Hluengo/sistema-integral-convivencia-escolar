/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const viteEnv = import.meta.env ?? {};
const supabaseUrl = viteEnv.VITE_SUPABASE_URL ?? nodeEnv.VITE_SUPABASE_URL;
const supabaseAnonKey =
  viteEnv.VITE_SUPABASE_ANON_KEY ??
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ??
  nodeEnv.VITE_SUPABASE_ANON_KEY ??
  nodeEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY o VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Créalas en el archivo .env.local',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
