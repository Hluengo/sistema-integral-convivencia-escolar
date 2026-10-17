/** @license SPDX-License-Identifier: Apache-2.0 */

const CAUSA_ADMIN_ROLES = ["admin", "direccion", "superadmin"];

/** Potestad de administración sobre un expediente (perfil o membresía de app). */
function hasCausaAdminRole(
  profileRole: string | null,
  appRole: string | null,
): boolean {
  return (
    CAUSA_ADMIN_ROLES.includes(profileRole ?? "") ||
    CAUSA_ADMIN_ROLES.includes(appRole ?? "")
  );
}

export const canDeleteCausaForRoles = hasCausaAdminRole;

/** Reabrir un expediente cerrado altera un dato legal: misma potestad que eliminarlo. */
export const canReopenCausaForRoles = hasCausaAdminRole;
