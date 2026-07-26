/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../lib/stores/authStore';
import { getMyMembership, isMembershipsEnabled } from '../services/membership.service';

export function useMemberships(applicationCode: string) {
  const {
    user,
    tenantId,
    membershipStatus,
    membershipRole,
    membershipLoading,
    setMembership,
    clearMembership,
  } = useAuthStore();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isMembershipsEnabled()) {
      clearMembership();
      return;
    }

    if (!user || !tenantId) {
      clearMembership();
      fetchedRef.current = false;
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    getMyMembership(applicationCode)
      .then(setMembership)
      .catch(() => {
        clearMembership();
      });
  }, [user, user?.id, tenantId, applicationCode, setMembership, clearMembership]);

  return {
    status: membershipStatus,
    role: membershipRole,
    loading: membershipLoading,
  };
}
