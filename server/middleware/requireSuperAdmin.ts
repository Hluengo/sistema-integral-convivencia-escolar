/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';

/**
 * Middleware que verifica que el usuario autenticado sea superadministrador.
 *
 * A diferencia de `requireRole`, NO exige `requireTenant` ni un `tenantId`
 * acotado: el superadmin pertenece al tenant por defecto y opera de forma
 * transversal (cross-tenant) mediante la service role key en los handlers.
 *
 * Debe colocarse DESPUÉS de `requireAuth` en la cadena del router, ya que
 * depende de `req.profileRole` inyectado por aquel.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user?.sub) {
    res.status(401).json({ error: 'Autenticación requerida.' });
    return;
  }

  const role = authReq.profileRole;

  if (!role) {
    res.status(403).json({ error: 'No fue posible determinar el rol del usuario.' });
    return;
  }

  if (role !== 'superadmin') {
    res.status(403).json({ error: 'Acceso restringido a superadministradores.' });
    return;
  }

  next();
}
