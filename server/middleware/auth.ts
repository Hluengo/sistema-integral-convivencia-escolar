/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Request, Response, NextFunction } from 'express';
import https from 'node:https';

export interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
  app_metadata?: Record<string, unknown>;
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

async function verifyJwtSignature(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  const hmacResult = await verifyJwtViaHmac(token, secret);
  if (hmacResult) return hmacResult;
  return verifyViaSupabaseApi(token);
}

async function injectTenantContext(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (req as Request & { user: JwtPayload }).user;
  if (!user?.sub) return;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !anonKey) return;
  try {
    const hostname = new URL(supabaseUrl).hostname;
    const userId = user.sub;
    const data = await new Promise<unknown>((resolve) => {
      const r = https.request(
        {
          hostname,
          path: `/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=tenant_id&limit=1`,
          method: 'GET',
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        },
        (res2) => {
          let chunks = '';
          res2.on('data', (c: string) => { chunks += c; });
          res2.on('end', () => {
            if (res2.statusCode !== 200) return resolve(null);
            try { resolve(JSON.parse(chunks)); } catch { resolve(null); }
          });
        },
      );
      r.on('error', () => resolve(null));
      r.setTimeout(3000, () => { r.destroy(); resolve(null); });
      r.end();
    });
    if (Array.isArray(data) && data.length > 0 && (data[0] as { tenant_id?: string }).tenant_id) {
      (req as Request & { tenantId?: string }).tenantId = (data[0] as { tenant_id: string }).tenant_id;
      res.setHeader('x-tenant-id', (data[0] as { tenant_id: string }).tenant_id);
    }
  } catch {
    // Tenant context is best-effort; continue without it
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida.' });
  }
  const token = authHeader.replace('Bearer ', '');
  if (token.length < 10) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  try {
    const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
    const payload = JWT_SECRET
      ? await verifyJwtSignature(token, JWT_SECRET)
      : await verifyViaSupabaseApi(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token JWT inválido o expirado.' });
    }
    (req as unknown as Record<string, unknown>).user = payload;
    await injectTenantContext(req, res);
    next();
  } catch {
    return res.status(401).json({ error: 'Token JWT inválido.' });
  }
}
