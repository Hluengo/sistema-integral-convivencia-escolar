/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest, ProfileRole } from '../types';

export function requireRole(allowedRoles: readonly ProfileRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user?.sub) {
      res.status(401).json({ error: 'Autenticación requerida.' });
      return;
    }

    if (!authReq.tenantId) {
      res.status(403).json({ error: 'No fue posible determinar el establecimiento autenticado.' });
      return;
    }

    const role = authReq.profileRole;

    if (!role) {
      res.status(403).json({ error: 'No fue posible determinar el rol del usuario.' });
      return;
    }

    if (!allowedRoles.includes(role)) {
      res.status(403).json({ error: 'No tiene permisos para realizar esta acción.' });
      return;
    }

    next();
  };
}
