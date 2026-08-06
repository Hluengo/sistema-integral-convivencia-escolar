/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function requestPasswordReset(email: string) {
  const redirectTo = typeof window === 'undefined' ? undefined : window.location.origin;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { data, error };
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password });
  return { data, error };
}

export async function signOut() {
  // El cierre normal solo debe eliminar la sesión de este navegador. El
  // alcance global depende de una llamada remota que puede fallar por red.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return { error };
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
