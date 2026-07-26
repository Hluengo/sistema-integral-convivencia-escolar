/** @license SPDX-License-Identifier: Apache-2.0 */

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange as subscribeAuth } from '../../../services/auth.service';
import { supabase } from '../../api/lib/supabase';
import type {
  MembershipResult,
  MembershipStatus,
  MembershipAuthMode,
  AppMembership,
} from '../../api/types/membership';
import { getMembershipAuthMode, isDev } from '../../api/lib/membershipConfig';

interface AuthState {
  user: User | null;
  tenantId: string | null;
  authLoading: boolean;
  showLoginModal: boolean;
  isAuthenticated: boolean;
  setShowLoginModal: (v: boolean) => void;
  setUser: (user: User | null) => void;
  setAuthLoading: (v: boolean) => void;

  membershipStatus: MembershipStatus;
  membershipAuthMode: MembershipAuthMode;
  applicationCode: string | null;
  appRole: string | null;
  membership: AppMembership | null;
  membershipError: string | null;
  membershipLoaded: boolean;
  legacyFallbackUsed: boolean;
  membershipLoading: boolean;

  setMembership: (result: MembershipResult, applicationCode: string) => void;
  setMembershipLoading: (loading: boolean) => void;
  setMembershipError: (error: string | null) => void;
  clearMembership: () => void;
  setLegacyFallbackUsed: (used: boolean) => void;
}

function logDev(event: string, detail?: string) {
  if (isDev()) {
    const msg = `[membership-store] ${event}${detail ? `: ${detail}` : ''}`;
    console.log(msg);
  }
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
  const AUTH_TIMEOUT_MS = 8000;

  const timeoutId = setTimeout(() => {
    set({ authLoading: false });
  }, AUTH_TIMEOUT_MS);

  subscribeAuth(async (_event, session) => {
    clearTimeout(timeoutId);
    const user = session?.user ?? null;
    const tenantId = user ? await loadTenantId(user.id) : null;
    set({
      user,
      tenantId,
      authLoading: false,
      isAuthenticated: !!user,
      ...(user === null
        ? {
            membershipStatus: 'not_available' as MembershipStatus,
            membershipAuthMode: getMembershipAuthMode(),
            applicationCode: null,
            appRole: null,
            membership: null,
            membershipError: null,
            membershipLoaded: false,
            legacyFallbackUsed: false,
            membershipLoading: false,
          }
        : {}),
    });
  });

  return {
    user: null,
    tenantId: null,
    authLoading: true,
    showLoginModal: false,
    isAuthenticated: false,

    membershipStatus: 'not_available' as MembershipStatus,
    membershipAuthMode: getMembershipAuthMode(),
    applicationCode: null,
    appRole: null,
    membership: null,
    membershipError: null,
    membershipLoaded: false,
    legacyFallbackUsed: false,
    membershipLoading: false,

    setMembership: (result: MembershipResult, applicationCode: string) => {
      logDev('set_membership', `${applicationCode} → ${result.status}`);
      set({
        membershipStatus: result.status,
        membershipAuthMode: getMembershipAuthMode(),
        applicationCode,
        appRole: result.applicationRole,
        membership: result.memberships.find((m) => m.application_code === applicationCode) ?? null,
        membershipError: result.status === 'error' ? 'Error al cargar membresía' : null,
        membershipLoaded: true,
        membershipLoading: false,
      });
    },

    setMembershipLoading: (loading: boolean) => {
      set({ membershipLoading: loading });
    },

    setMembershipError: (error: string | null) => {
      logDev('set_membership_error', error ?? 'cleared');
      set({ membershipError: error, membershipLoading: false });
    },

    clearMembership: () => {
      logDev('clear_membership');
      set({
        membershipStatus: 'not_available' as MembershipStatus,
        membershipAuthMode: getMembershipAuthMode(),
        applicationCode: null,
        appRole: null,
        membership: null,
        membershipError: null,
        membershipLoaded: false,
        legacyFallbackUsed: false,
        membershipLoading: false,
      });
    },

    setLegacyFallbackUsed: (used: boolean) => {
      if (used) logDev('legacy_fallback_used');
      set({ legacyFallbackUsed: used });
    },

    setShowLoginModal: (v) => set({ showLoginModal: v }),
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setAuthLoading: (v) => set({ authLoading: v }),
  };
});
