/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useRef } from 'react';
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
    console.log(msg);
  }
}

export function useMemberships(applicationCode: string) {
  const {
    user,
    tenantId,
    membershipStatus,
    membershipAuthMode,
    appRole,
    membershipError,
    membershipLoaded,
    membershipLoading,
    legacyFallbackUsed,
    setMembership,
    setMembershipLoading,
    setMembershipError,
    clearMembership,
    setLegacyFallbackUsed,
  } = useAuthStore();
  const fetchedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const mode = getMembershipMode();

    if (mode === 'legacy') {
      logDev('legacy_mode_skip');
      clearMembership();
      setLegacyFallbackUsed(true);
      return;
    }

    if (!user || !tenantId) {
      if (fetchedRef.current) {
        logDev('session_cleared');
        fetchedRef.current = false;
        lastUserIdRef.current = null;
        clearMembership();
      }
      return;
    }

    if (lastUserIdRef.current !== user.id) {
      logDev('user_changed', 'resetting');
      fetchedRef.current = false;
      invalidateMembershipCache();
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;
    lastUserIdRef.current = user.id;

    setMembershipLoading(true);

    getMyMembership(applicationCode)
      .then((result) => {
        setMembership(result, applicationCode);

        if (result.status === 'no_membership' && mode === 'transition') {
          const allowedRoles = getAllowedRoles(applicationCode);
          if (allowedRoles.length > 0) {
            logDev('fallback_check', `checking ${allowedRoles.join(',')}`);
          }
          setLegacyFallbackUsed(true);
        }
      })
      .catch((err) => {
        logDev('membership_load_error', err instanceof Error ? err.message : String(err));
        setMembershipError('Error al verificar membresía');
      });
  }, [
    user,
    user?.id,
    tenantId,
    applicationCode,
    setMembership,
    setMembershipLoading,
    setMembershipError,
    clearMembership,
    setLegacyFallbackUsed,
  ]);

  const mode = getMembershipMode();
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
