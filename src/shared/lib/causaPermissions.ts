/** @license SPDX-License-Identifier: Apache-2.0 */

import type { UserRole } from "./types";

const CAUSA_ADMIN_ROLES = ["admin", "direccion", "superadmin"];

/** El perfil no sustituye una membresía administrativa de Convivencia. */
function hasCausaAdminRole(
  _profileRole: string | null,
  appRole: string | null,
): boolean {
  return CAUSA_ADMIN_ROLES.includes(appRole ?? "");
}

/** Sin un rol autorizado, el expediente se presenta en modo de solo lectura. */
export function resolveCausaUserRole(
  profileRole: string | null,
  appRole: string | null,
): UserRole {
  if (hasCausaAdminRole(profileRole, appRole)) return "director_rector";
  if (
    ["convivencia", "inspectoria", "inspector", "staff"].includes(appRole ?? "")
  ) {
    return "convivencia_escolar";
  }
  return "docente";
}

export const canDeleteCausaForRoles = hasCausaAdminRole;

/** Reabrir un expediente cerrado altera un dato legal: misma potestad que eliminarlo. */
export const canReopenCausaForRoles = hasCausaAdminRole;
