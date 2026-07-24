/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';

export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user?.sub) {
    res.status(401).json({ error: 'Autenticación requerida.' });
    return;
  }

  if (!authReq.tenantId) {
    res.status(403).json({ error: 'No fue posible determinar el establecimiento autenticado.' });
    return;
  }

  next();
}
