/** @license SPDX-License-Identifier: Apache-2.0 */

export function canDeleteCausaForRoles(
  profileRole: string | null,
  appRole: string | null,
): boolean {
  return (
    profileRole === 'admin' ||
    profileRole === 'direccion' ||
    profileRole === 'superadmin' ||
    appRole === 'admin' ||
    appRole === 'direccion' ||
    appRole === 'superadmin'
  );
}
