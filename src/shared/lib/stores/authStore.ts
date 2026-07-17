/** @license SPDX-License-Identifier: Apache-2.0 */

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange as subscribeAuth } from '../../../services/auth.service';
import { supabase } from '../../api/lib/supabase';

interface AuthState {
  user: User | null;
  tenantId: string | null;
  authLoading: boolean;
  showLoginModal: boolean;
  isAuthenticated: boolean;
  setShowLoginModal: (v: boolean) => void;
  setUser: (user: User | null) => void;
  setAuthLoading: (v: boolean) => void;
}

async function loadTenantId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.tenant_id ?? null;
}

export const useAuthStore = create<AuthState>((set) => {
  let resolved = false;
  const AUTH_TIMEOUT_MS = 8000;

  subscribeAuth(async (_event, session) => {
    if (resolved) { return; }
    resolved = true;
    const user = session?.user ?? null;
    const tenantId = user ? await loadTenantId(user.id) : null;
    set({ user, tenantId, authLoading: false, isAuthenticated: !!user });
  });

  setTimeout(() => {
    if (resolved) {
      return;
    }
    resolved = true;
    set({ authLoading: false });
    console.warn('Auth initialization timed out — continuing without session');
  }, AUTH_TIMEOUT_MS);

  return {
    user: null,
    tenantId: null,
    authLoading: true,
    showLoginModal: false,
    isAuthenticated: false,
    setShowLoginModal: (v) => set({ showLoginModal: v }),
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setAuthLoading: (v) => set({ authLoading: v }),
  };
});
