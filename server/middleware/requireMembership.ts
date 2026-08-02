/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types';
import https from 'node:https';

export type MembershipAuthMode = 'legacy' | 'transition' | 'enforced';

/** Roles that may enter the convivencia application. Endpoint-level permissions
 * remain enforced separately by requireRole where an operation is restricted. */
export const CONVIVENCIA_MEMBERSHIP_ROLES = [
  'superadmin',
  'admin',
  'direccion',
  'convivencia',
  'inspectoria',
  'profesor_jefe',
  'teacher',
  'inspector',
  'user',
  'staff',
] as const;

export const CONVIVENCIA_MEMBERSHIP = {
  applicationCode: 'convivencia',
  allowedRoles: CONVIVENCIA_MEMBERSHIP_ROLES,
} as const;

export interface MembershipCheckParams {
  applicationCode: string;
  allowedRoles?: readonly string[];
}

export type MembershipAccessChecker = (
  hostname: string,
  anonKey: string,
  token: string,
  params: MembershipCheckParams,
) => Promise<boolean>;

function getMembershipMode(): MembershipAuthMode {
  const enabled = process.env.VITE_APP_MEMBERSHIPS_ENABLED === 'true';
  const enforced = process.env.VITE_APP_MEMBERSHIPS_ENFORCED === 'true';

  if (!enabled) return 'legacy';
  if (enforced) return 'enforced';
  return 'transition';
}

function logServer(event: string, detail?: string) {
  if (process.env.NODE_ENV !== 'production') {
    const msg = `[membership-server] ${event}${detail ? `: ${detail}` : ''}`;
    console.debug(msg);
  }
}

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

function getSupabaseConfig(): { hostname: string; anonKey: string } | null {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) return null;
  try {
    return { hostname: new URL(supabaseUrl).hostname, anonKey };
  } catch {
    return null;
  }
}

export function requireMembership(
  params: MembershipCheckParams,
  checkAccess: MembershipAccessChecker = checkMembershipViaApi,
) {
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

    const mode = getMembershipMode();

    if (mode === 'legacy') {
      logServer('legacy_mode', 'using profile role');
      if (params.allowedRoles && authReq.profileRole) {
        if (!params.allowedRoles.includes(authReq.profileRole)) {
          res.status(403).json({ error: 'No tiene permisos para realizar esta acción.' });
          return;
        }
      }
      next();
      return;
    }

    const config = getSupabaseConfig();
    if (!config) {
      res.status(500).json({ error: 'Error de configuración del servidor.' });
      return;
    }

    const token = authReq.authToken;
    if (!token) {
      res.status(401).json({ error: 'Token de autenticación requerido.' });
      return;
    }

    try {
      logServer('membership_check', `${mode} mode for ${params.applicationCode}`);
      const hasAccess = await checkAccess(config.hostname, config.anonKey, token, params);

      if (hasAccess) {
        next();
        return;
      }

      if (mode === 'transition') {
        logServer('transition_fallback', 'membership denied, trying profile role');
        if (params.allowedRoles && authReq.profileRole) {
          if (params.allowedRoles.includes(authReq.profileRole)) {
            logServer('transition_fallback_success', authReq.profileRole);
            next();
            return;
          }
        }
        logServer('transition_fallback_denied', 'no matching role');
      }

      res.status(403).json({ error: 'No tiene una membresía activa para esta aplicación.' });
    } catch (err) {
      if (mode === 'transition') {
        logServer(
          'transition_fallback',
          `membership check failed: ${err instanceof Error ? err.message : 'unknown'}, trying profile role`,
        );
        if (params.allowedRoles && authReq.profileRole) {
          if (params.allowedRoles.includes(authReq.profileRole)) {
            logServer('transition_fallback_success', authReq.profileRole);
            next();
            return;
          }
        }
        logServer('transition_fallback_denied', 'no matching role after error');
      }
      res.status(500).json({ error: 'Error al verificar membresía.' });
    }
  };
}
