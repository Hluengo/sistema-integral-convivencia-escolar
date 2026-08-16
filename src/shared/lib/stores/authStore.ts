/** @license SPDX-License-Identifier: Apache-2.0 */

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange as subscribeAuth } from '../../api/services/auth.service';
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
  profileRole: string | null;
  authLoading: boolean;
  showLoginModal: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  setShowLoginModal: (v: boolean) => void;
  clearSessionExpired: () => void;
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
    console.debug(msg);
  }
}

let authSubscription: ReturnType<typeof subscribeAuth> | null = null;
let authTimeoutId: ReturnType<typeof setTimeout> | null = null;

export function disposeAuthStoreSubscription() {
  authSubscription?.data.subscription.unsubscribe();
  authSubscription = null;
  if (authTimeoutId) {
    clearTimeout(authTimeoutId);
    authTimeoutId = null;
  }
}

async function loadTenantProfile(
  userId: string,
): Promise<{ tenantId: string | null; role: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('tenant_id,role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Error loading tenant profile:', error);
    return { tenantId: null, role: null };
  }
  return { tenantId: data?.tenant_id ?? null, role: data?.role ?? null };
}

export const useAuthStore = create<AuthState>((set) => {
  const AUTH_TIMEOUT_MS = 8000;
  let hadAuthenticatedSession = false;

  authTimeoutId = setTimeout(() => {
    set({ authLoading: false });
    authTimeoutId = null;
  }, AUTH_TIMEOUT_MS);

  // Do not await Supabase queries inside onAuthStateChange. Supabase holds an
  // internal auth lock while invoking this callback; using the same client
  // before the callback returns can leave subsequent REST requests without a
  // usable session and produce repeated 401 responses.
  disposeAuthStoreSubscription();
  authSubscription = subscribeAuth((event, session) => {
    if (authTimeoutId) {
      clearTimeout(authTimeoutId);
      authTimeoutId = null;
    }
    const user = session?.user ?? null;
    const sessionEndedUnexpectedly = event === 'SIGNED_OUT' && hadAuthenticatedSession;
    if (user) hadAuthenticatedSession = true;
    if (event === 'SIGNED_OUT') hadAuthenticatedSession = false;

    if (event === 'PASSWORD_RECOVERY' && typeof window !== 'undefined') {
      window.sessionStorage.setItem('supabase-password-recovery', 'true');
    }

    set({
      user,
      ...(event === 'PASSWORD_RECOVERY' ? { showLoginModal: true } : {}),
      tenantId: user ? null : null,
      profileRole: null,
      authLoading: false,
      isAuthenticated: Boolean(session?.access_token && user),
      ...(user ? { sessionExpired: false } : {}),
      ...(sessionEndedUnexpectedly ? { sessionExpired: true, showLoginModal: true } : {}),
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

    if (user) {
      queueMicrotask(() => {
        void loadTenantProfile(user.id).then((profile) => {
          set((state) =>
            state.user?.id === user.id
              ? { tenantId: profile.tenantId, profileRole: profile.role }
              : state,
          );
        });
      });
    }
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      disposeAuthStoreSubscription();
    });
  }

  return {
    user: null,
    tenantId: null,
    profileRole: null,
    authLoading: true,
    showLoginModal: false,
    isAuthenticated: false,
    sessionExpired: false,

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
    clearSessionExpired: () => {
      hadAuthenticatedSession = false;
      set({ sessionExpired: false });
    },
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setAuthLoading: (v) => set({ authLoading: v }),
  };
});
