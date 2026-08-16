/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo } from 'react';

const ROLE_PRIORITY: Record<string, number> = {
  superadmin: 7,
  admin: 6,
  direccion: 5,
  convivencia: 4,
  inspectoria: 3,
  inspector: 2,
  profesor_jefe: 1,
  teacher: 1,
  staff: 1,
  user: 0,
};

interface UseRoleGatesArgs {
  isAuthenticated: boolean;
  tenantId: string | null;
  userId: string | undefined;
  profileRole: string | null;
  appRole: string | null;
}

export function resolveRoleGates({
  isAuthenticated,
  tenantId,
  userId,
  profileRole,
  appRole,
}: UseRoleGatesArgs) {
  const effectiveAdminRole = [profileRole, appRole].sort(
    (left, right) => (ROLE_PRIORITY[right ?? ''] ?? -1) - (ROLE_PRIORITY[left ?? ''] ?? -1),
  )[0];

  const canAccessAdmin =
    effectiveAdminRole === 'admin' ||
    effectiveAdminRole === 'direccion' ||
    effectiveAdminRole === 'superadmin';
  const canAccessReports = [
    'admin',
    'direccion',
    'convivencia',
    'inspectoria',
    'superadmin',
  ].includes(effectiveAdminRole ?? '');
  const canAccessPlatform = effectiveAdminRole === 'superadmin';
  const onboardingEnabled =
    isAuthenticated &&
    Boolean(tenantId && userId) &&
    (effectiveAdminRole === 'admin' ||
      effectiveAdminRole === 'direccion' ||
      effectiveAdminRole === 'superadmin');

  return {
    effectiveAdminRole,
    canAccessAdmin,
    canAccessReports,
    canAccessPlatform,
    onboardingEnabled,
  };
}

export function useRoleGates({
  isAuthenticated,
  tenantId,
  userId,
  profileRole,
  appRole,
}: UseRoleGatesArgs) {
  return useMemo(
    () => resolveRoleGates({ isAuthenticated, tenantId, userId, profileRole, appRole }),
    [appRole, isAuthenticated, profileRole, tenantId, userId],
  );
}
