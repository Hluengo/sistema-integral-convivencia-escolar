/** @license SPDX-License-Identifier: Apache-2.0 */

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange as subscribeAuth } from '../services/auth.service';

interface AuthState {
  user: User | null;
  authLoading: boolean;
  showLoginModal: boolean;
  isAuthenticated: boolean;
  setShowLoginModal: (v: boolean) => void;
  setUser: (user: User | null) => void;
  setAuthLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  subscribeAuth((_event, session) => {
    set({ user: session?.user ?? null, authLoading: false, isAuthenticated: !!session?.user });
  });
  return {
    user: null,
    authLoading: true,
    showLoginModal: false,
    isAuthenticated: false,
    setShowLoginModal: (v) => set({ showLoginModal: v }),
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setAuthLoading: (v) => set({ authLoading: v }),
  };
});
