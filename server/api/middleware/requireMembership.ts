/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import https from 'node:https';

interface MembershipCheckParams {
  applicationCode: string;
  allowedRoles?: readonly string[];
}

const MEMBERSHIPS_ENABLED = () => process.env.VITE_APP_MEMBERSHIPS_ENABLED === 'true';

async function checkMembershipViaApi(
  hostname: string,
  anonKey: string,
  token: string,
  params: MembershipCheckParams,
): Promise<boolean> {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      p_application_code: params.applicationCode,
      p_roles: params.allowedRoles ? [...params.allowedRoles] : null,
    });

    const req = https.request(
      {
        hostname,
        path: '/rest/v1/rpc/has_app_access',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data === 'true');
          } else {
            resolve(false);
          }
        });
      },
    );
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
    req.write(body);
    req.end();
  });
}

export function requireMembership(params: MembershipCheckParams) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user?.sub) {
      res.status(401).json({ error: 'Autenticación requerida.' });
      return;
    }

    if (!authReq.tenantId) {
      res.status(403).json({ error: 'No fue posible determinar el establecimiento autenticado.' });
      return;
    }

    if (!MEMBERSHIPS_ENABLED()) {
      if (params.allowedRoles && authReq.profileRole) {
        if (!params.allowedRoles.includes(authReq.profileRole)) {
          res.status(403).json({ error: 'No tiene permisos para realizar esta acción.' });
          return;
        }
      }
      next();
      return;
    }

    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const anonKey =
        process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !anonKey) {
        res.status(500).json({ error: 'Error de configuración del servidor.' });
        return;
      }

      const hostname = new URL(supabaseUrl).hostname;
      const token = authReq.authToken;

      if (!token) {
        res.status(401).json({ error: 'Token de autenticación requerido.' });
        return;
      }

      const hasAccess = await checkMembershipViaApi(hostname, anonKey, token, params);

      if (!hasAccess) {
        res.status(403).json({ error: 'No tiene una membresía activa para esta aplicación.' });
        return;
      }

      next();
    } catch {
      res.status(500).json({ error: 'Error al verificar membresía.' });
    }
  };
}
