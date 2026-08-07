/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/stores/authStore';
import {
  getMyMembership,
  getMembershipMode,
  invalidateMembershipCache,
} from '../services/membership.service';
import { getAllowedRoles, isDev } from '../lib/membershipConfig';

function logDev(event: string, detail?: string) {
  if (isDev()) {
    const msg = `[useMemberships] ${event}${detail ? `: ${detail}` : ''}`;
    console.debug(msg);
  }
}

export function useMemberships(applicationCode: string) {
  const user = useAuthStore((state) => state.user);
  const tenantId = useAuthStore((state) => state.tenantId);
  const membershipStatus = useAuthStore((state) => state.membershipStatus);
  const membershipAuthMode = useAuthStore((state) => state.membershipAuthMode);
  const appRole = useAuthStore((state) => state.appRole);
  const membershipError = useAuthStore((state) => state.membershipError);
  const membershipLoaded = useAuthStore((state) => state.membershipLoaded);
  const membershipLoading = useAuthStore((state) => state.membershipLoading);
  const legacyFallbackUsed = useAuthStore((state) => state.legacyFallbackUsed);
  const setMembership = useAuthStore((state) => state.setMembership);
  const setMembershipLoading = useAuthStore((state) => state.setMembershipLoading);
  const setMembershipError = useAuthStore((state) => state.setMembershipError);
  const clearMembership = useAuthStore((state) => state.clearMembership);
  const setLegacyFallbackUsed = useAuthStore((state) => state.setLegacyFallbackUsed);

  const mode = getMembershipMode();
  const shouldFetch = mode !== 'legacy' && Boolean(user && tenantId);

  // Cuando cambia el usuario, la caché interna del servicio debe invalidarse
  // para que el próximo fetch no reutilice datos de una sesión anterior.
  useEffect(() => {
    if (user?.id) invalidateMembershipCache();
  }, [user?.id]);

  useEffect(() => {
    if (mode === 'legacy') {
      logDev('legacy_mode_skip');
      clearMembership();
      setLegacyFallbackUsed(true);
      return;
    }

    if (!user || !tenantId) {
      if (membershipLoaded) {
        logDev('session_cleared');
        clearMembership();
      }
      return;
    }
  }, [mode, user, tenantId, membershipLoaded, clearMembership, setLegacyFallbackUsed]);

  const membershipQuery = useQuery({
    queryKey: ['membership', applicationCode, user?.id ?? 'anonymous'],
    queryFn: () => getMyMembership(applicationCode),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!shouldFetch) return;

    if (membershipQuery.isPending) {
      setMembershipLoading(true);
      return;
    }

    setMembershipLoading(false);

    if (membershipQuery.isError) {
      logDev('membership_load_error', String(membershipQuery.error));
      setMembershipError('Error al verificar membresía');
      return;
    }

    const result = membershipQuery.data;
    if (!result) return;

    setMembership(result, applicationCode);

    if (result.status === 'no_membership' && mode === 'transition') {
      const allowedRoles = getAllowedRoles(applicationCode);
      if (allowedRoles.length > 0) {
        logDev('fallback_check', `checking ${allowedRoles.join(',')}`);
      }
      setLegacyFallbackUsed(true);
    }
  }, [
    shouldFetch,
    membershipQuery.isPending,
    membershipQuery.isError,
    membershipQuery.error,
    membershipQuery.data,
    mode,
    applicationCode,
    setMembership,
    setMembershipLoading,
    setMembershipError,
    setLegacyFallbackUsed,
  ]);

  const hasAccess =
    mode === 'legacy' ||
    membershipStatus === 'active' ||
    (mode === 'transition' && legacyFallbackUsed && membershipStatus !== 'inactive');

  return {
    status: membershipStatus,
    authMode: membershipAuthMode,
    role: appRole,
    loading: membershipLoading,
    loaded: membershipLoaded,
    error: membershipError,
    legacyFallbackUsed,
    hasAccess,
  };
}
