/** @license SPDX-License-Identifier: Apache-2.0 */

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { onAuthStateChange as subscribeAuth } from "../../api/services/auth.service";
import { supabase } from "../../api/lib/supabase";
import type {
  MembershipResult,
  MembershipStatus,
  MembershipAuthMode,
  AppMembership,
} from "../../api/types/membership";
import { getMembershipAuthMode, isDev } from "../../api/lib/membershipConfig";
import { clearUserSessionDrafts } from "../sessionDraft";

interface AuthState {
  user: User | null;
  tenantId: string | null;
  profileRole: string | null;
  authLoading: boolean;
  showLoginModal: boolean;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  authorizationRevision: number;
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
    const msg = `[membership-store] ${event}${detail ? `: ${detail}` : ""}`;
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
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("tenant_id,role,is_active")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || data?.is_active === false)
      return { tenantId: null, role: null };
    return { tenantId: data?.tenant_id ?? null, role: data?.role ?? null };
  } catch {
    console.error("No fue posible verificar el perfil del colegio.");
    return { tenantId: null, role: null };
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  const AUTH_TIMEOUT_MS = 8000;
  let hadAuthenticatedSession = false;
  let authGeneration = 0;

  authTimeoutId = setTimeout(() => {
    set({ authLoading: false });
    authTimeoutId = null;
  }, AUTH_TIMEOUT_MS);

  // Supabase mantiene un lock durante el callback: consultar después evita bloqueos de sesión.
  disposeAuthStoreSubscription();
  authSubscription = subscribeAuth((event, session) => {
    if (authTimeoutId) {
      clearTimeout(authTimeoutId);
      authTimeoutId = null;
    }
    const user = session?.user ?? null;
    const generation = ++authGeneration;
    const previousUserId = get()?.user?.id;
    const identityChanged = previousUserId !== user?.id;
    if (previousUserId && identityChanged)
      clearUserSessionDrafts(previousUserId);
    const sessionEndedUnexpectedly =
      event === "SIGNED_OUT" && hadAuthenticatedSession;
    if (user) hadAuthenticatedSession = true;
    if (event === "SIGNED_OUT") hadAuthenticatedSession = false;

    if (event === "PASSWORD_RECOVERY" && typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("supabase-password-recovery", "true");
      } catch {
        // El formulario de recuperación sigue disponible con storage bloqueado.
      }
    }

    set({
      user,
      ...(event === "PASSWORD_RECOVERY" ? { showLoginModal: true } : {}),
      ...(identityChanged ? { tenantId: null, profileRole: null } : {}),
      authLoading: false,
      isAuthenticated: Boolean(session?.access_token && user),
      ...(user ? { sessionExpired: false } : {}),
      ...(sessionEndedUnexpectedly
        ? { sessionExpired: true, showLoginModal: true }
        : {}),
      ...(identityChanged || user === null
        ? {
            membershipStatus: "not_available" as MembershipStatus,
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
          set((state) => {
            if (state.user?.id !== user.id || generation !== authGeneration)
              return state;
            const scopeChanged = state.tenantId !== profile.tenantId;
            const accessUnavailable = !profile.tenantId || !profile.role;
            return {
              tenantId: profile.tenantId,
              profileRole: profile.role,
              authorizationRevision: state.authorizationRevision + 1,
              ...(scopeChanged || accessUnavailable
                ? {
                    appRole: null,
                    membership: null,
                    membershipStatus: (accessUnavailable
                      ? "error"
                      : "not_available") as MembershipStatus,
                    membershipLoaded: accessUnavailable,
                    membershipLoading: false,
                    membershipError: accessUnavailable
                      ? "No fue posible verificar un perfil activo en el colegio. Inicie sesión nuevamente o solicite la revisión de su acceso."
                      : null,
                    legacyFallbackUsed: false,
                  }
                : {}),
            };
          });
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
    authorizationRevision: 0,

    membershipStatus: "not_available" as MembershipStatus,
    membershipAuthMode: getMembershipAuthMode(),
    applicationCode: null,
    appRole: null,
    membership: null,
    membershipError: null,
    membershipLoaded: false,
    legacyFallbackUsed: false,
    membershipLoading: false,

    setMembership: (result: MembershipResult, applicationCode: string) => {
      logDev("set_membership", `${applicationCode} → ${result.status}`);
      set({
        membershipStatus: result.status,
        membershipAuthMode: getMembershipAuthMode(),
        applicationCode,
        appRole: result.applicationRole,
        membership:
          result.memberships.find(
            (m) => m.application_code === applicationCode,
          ) ?? null,
        membershipError:
          result.status === "error" ? "Error al cargar membresía" : null,
        membershipLoaded: true,
        membershipLoading: false,
      });
    },

    setMembershipLoading: (loading: boolean) => {
      set({ membershipLoading: loading });
    },

    setMembershipError: (error: string | null) => {
      logDev("set_membership_error", error ?? "cleared");
      set({
        membershipError: error,
        membershipLoading: false,
        ...(error
          ? {
              membershipStatus: "error" as MembershipStatus,
              appRole: null,
              membershipLoaded: true,
              legacyFallbackUsed: false,
            }
          : {}),
      });
    },

    clearMembership: () => {
      logDev("clear_membership");
      set({
        membershipStatus: "not_available" as MembershipStatus,
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
      if (used) logDev("legacy_fallback_used");
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
