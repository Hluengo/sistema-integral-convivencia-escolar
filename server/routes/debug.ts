/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';
import { Router } from 'express';

const router = Router();

async function verifyHmac(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  const sig = Buffer.from(parts[2], 'base64url');

  for (const secretBytes of [new TextEncoder().encode(secret), Buffer.from(secret, 'base64')]) {
    try {
      const key = await crypto.subtle.importKey(
        'raw', secretBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['verify']
      );
      const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const valid = await crypto.subtle.verify('HMAC', key, sig, data);
      if (valid) {
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
        return payload;
      }
    } catch { /* try next */ }
  }
  return null;
}

router.get('/auth-debug', async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

  const info: Record<string, unknown> = {
    hasToken: token.length > 10,
    hasSecret: !!JWT_SECRET,
    secretLength: JWT_SECRET ? JWT_SECRET.length : 0,
    tokenParts: token.split('.').length,
  };

  if (info.hasToken && info.hasSecret) {
    const payload = await verifyHmac(token, JWT_SECRET as string);
    info.verified = !!payload;
    info.userId = payload?.sub;
    info.email = payload?.email;

    const parts = token.split('.');
    const sig = Buffer.from(parts[2], 'base64url');
    const rawKey = new TextEncoder().encode(JWT_SECRET as string);

    try {
      const k1 = await crypto.subtle.importKey(
        'raw', rawKey,
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['verify']
      );
      info.rawSecretWorks = await crypto.subtle.verify(
        'HMAC', k1, sig,
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
      );
    } catch {
      info.rawSecretWorks = false;
    }

    try {
      const b64Key = Buffer.from(JWT_SECRET as string, 'base64');
      const k2 = await crypto.subtle.importKey(
        'raw', b64Key,
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['verify']
      );
      info.b64SecretWorks = await crypto.subtle.verify(
        'HMAC', k2, sig,
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
      );
    } catch {
      info.b64SecretWorks = false;
    }
  }

  res.json(info);
});

export default router;
