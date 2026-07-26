/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Request, Response, NextFunction } from 'express';
import https from 'node:https';
import type { AuthenticatedRequest, ProfileRole } from '../types';
import { verifyJwtWithJwks } from '../lib/jwks';

export interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  app_metadata?: Record<string, unknown>;
}

export type JwtAppMetadata = Record<string, unknown>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_ROLES: readonly ProfileRole[] = [
  'admin',
  'direccion',
  'convivencia',
  'inspectoria',
  'profesor_jefe',
  'teacher',
  'inspector',
  'user',
  'staff',
];

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isValidRole(value: string): value is ProfileRole {
  return (VALID_ROLES as readonly string[]).includes(value);
}

async function verifyJwtViaHmac(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  let payload: JwtPayload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch {
    return null;
  }

  const signature = Buffer.from(parts[2], 'base64url');

  for (const secretBytes of [new TextEncoder().encode(secret), Buffer.from(secret, 'base64')]) {
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const valid = await crypto.subtle.verify('HMAC', key, signature, data);
      if (valid) {
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        return payload;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function verifyViaSupabaseApi(token: string): Promise<JwtPayload | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey || !URL.canParse(supabaseUrl)) {
    return Promise.resolve(null);
  }

  const hostname = new URL(supabaseUrl).hostname;
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname,
        path: '/auth/v1/user',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) return resolve(null);
          try {
            const user = JSON.parse(data) as { id: string; email: string; role: string };
            resolve({ sub: user.id, email: user.email, role: user.role });
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

async function verifyJwtSignature(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  let header: { alg?: string; kid?: string };
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  } catch {
    return null;
  }

  const alg = header.alg ?? '';
  const kid = header.kid;

  if (alg === 'none') return null;

  const isAsymmetric = /^(ES|RS)/.test(alg);

  if (isAsymmetric) {
    if (!kid) return null;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return null;
    try {
      const result = await verifyJwtWithJwks(token, supabaseUrl);
      return result as unknown as JwtPayload;
    } catch {
      return null;
    }
  }

  // Symmetric or unknown → HMAC legacy or Supabase API
  const hmacResult = await verifyJwtViaHmac(token, secret);
  if (hmacResult) return hmacResult;
  return verifyViaSupabaseApi(token);
}

export interface ProfileLookupResult {
  tenantId: string;
  profileRole: ProfileRole;
}

export type ProfileFetcher = (
  params: {
    supabaseUrl: string;
    anonKey: string;
    token: string;
    userId: string;
  },
  httpsImpl: typeof https,
) => Promise<ProfileLookupResult | null>;

const defaultProfileFetcher: ProfileFetcher = async (
  { supabaseUrl, anonKey, token, userId },
  httpsImpl,
): Promise<ProfileLookupResult | null> => {
  const hostname = new URL(supabaseUrl).hostname;
  const data = await new Promise<unknown>((resolve) => {
    const r = httpsImpl.request(
      {
        hostname,
        path: `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=tenant_id,role&limit=1`,
        method: 'GET',
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      },
      (res2) => {
        let chunks = '';
        res2.on('data', (c: string) => {
          chunks += c;
        });
        res2.on('end', () => {
          if (res2.statusCode !== 200) return resolve(null);
          try {
            resolve(JSON.parse(chunks));
          } catch {
            resolve(null);
          }
        });
      },
    );
    r.on('error', () => resolve(null));
    r.setTimeout(3000, () => {
      r.destroy();
      resolve(null);
    });
    r.end();
  });

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const profile = data[0] as { tenant_id?: string; role?: string };
  if (!profile.tenant_id || !isValidUuid(profile.tenant_id)) {
    return null;
  }
  if (!profile.role) {
    return null;
  }

  return {
    tenantId: profile.tenant_id,
    profileRole: profile.role as ProfileRole,
  };
};

export async function injectTenantContext(
  req: AuthenticatedRequest,
  token: string,
  profileFetcher: ProfileFetcher = defaultProfileFetcher,
): Promise<boolean> {
  const user = req.user;
  if (!user?.sub) return false;

  // Fast-path: read tenant_id and role directly from the signed JWT app_metadata.
  // This avoids a DB round-trip when the identity provider (Supabase) already
  // synchronizes these claims, and it makes self-contained test JWTs possible.
  const appMetadata = user.app_metadata;
  const jwtTenantId =
    typeof appMetadata?.tenant_id === 'string' ? appMetadata.tenant_id : undefined;
  const jwtRole = typeof appMetadata?.role === 'string' ? appMetadata.role : undefined;
  if (jwtTenantId && isValidUuid(jwtTenantId) && jwtRole && isValidRole(jwtRole)) {
    req.tenantId = jwtTenantId;
    req.profileRole = jwtRole;
    return true;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey || !URL.canParse(supabaseUrl)) {
    return false;
  }

  try {
    const result = await profileFetcher({ supabaseUrl, anonKey, token, userId: user.sub }, https);
    if (!result) {
      return false;
    }
    if (!isValidUuid(result.tenantId) || !result.profileRole) {
      return false;
    }
    req.tenantId = result.tenantId;
    req.profileRole = result.profileRole;
    return true;
  } catch (err) {
    console.error(
      '[tenant] Failed to inject tenant context:',
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

export function createRequireAuth(profileFetcher?: ProfileFetcher) {
  return async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Autenticación requerida.' });
      return;
    }
    const token = authHeader.replace('Bearer ', '');
    if (token.length < 10) {
      res.status(401).json({ error: 'Token inválido.' });
      return;
    }

    try {
      const payload = await verifyJwtSignature(token, process.env.SUPABASE_JWT_SECRET ?? '');
      if (!payload) {
        res.status(401).json({ error: 'Token JWT inválido o expirado.' });
        return;
      }
      const authReq = req as AuthenticatedRequest;
      authReq.user = payload;
      authReq.authToken = token;
      const tenantOk = await injectTenantContext(authReq, token, profileFetcher);
      if (!tenantOk) {
        res.status(403).json({
          error:
            'No fue posible determinar el establecimiento autenticado. Verifique que su perfil esté activo.',
        });
        return;
      }
      next();
    } catch {
      res.status(401).json({ error: 'Token JWT inválido.' });
    }
  };
}

export const requireAuth = createRequireAuth();
