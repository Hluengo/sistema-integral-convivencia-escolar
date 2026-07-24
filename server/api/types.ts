/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Request } from 'express';

/**
 * Rol funcional del usuario en profiles.role.
 * Usado para autorización backend.
 * NO confundir con UserRole de la interfaz (convivencia_escolar, director_rector, etc.).
 */
export type ProfileRole =
  | 'admin'
  | 'direccion'
  | 'convivencia'
  | 'inspectoria'
  | 'profesor_jefe'
  | 'teacher'
  | 'inspector'
  | 'user'
  | 'staff';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    email?: string;
  };
  tenantId?: string;
  profileRole?: ProfileRole;
}
