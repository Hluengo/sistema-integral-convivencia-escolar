/** @license SPDX-License-Identifier: Apache-2.0 */

import type { UserRole } from "./types";

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

/** Sin un rol autorizado, el expediente se presenta en modo de solo lectura. */
export function resolveCausaUserRole(
  profileRole: string | null,
  appRole: string | null,
): UserRole {
  if (hasCausaAdminRole(profileRole, appRole)) return "director_rector";
  if (
    [profileRole, appRole].some((role) =>
      // "staff" es el rol operativo de convivencia: las políticas RLS le dan
      // INSERT/UPDATE sobre causas, aunque no borrar ni reabrir.
      ["convivencia", "inspectoria", "inspector", "staff"].includes(role ?? ""),
    )
  ) {
    return "convivencia_escolar";
  }
  return "docente";
}

export const canDeleteCausaForRoles = hasCausaAdminRole;

/** Reabrir un expediente cerrado altera un dato legal: misma potestad que eliminarlo. */
export const canReopenCausaForRoles = hasCausaAdminRole;
