/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import crypto from 'node:crypto';

const router = Router();

router.get('/auth-debug', async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

  const info: Record<string, unknown> = {
    hasToken: token.length > 10,
    hasSecret: !!JWT_SECRET,
    secretLength: JWT_SECRET ? JWT_SECRET.length : 0,
    tokenParts: token.split('.').length,
  };

  if (info.hasToken && JWT_SECRET) {
    const parts = token.split('.');
    const sig = Buffer.from(parts[2], 'base64url');
    const rawKey = new TextEncoder().encode(JWT_SECRET);
    const b64Key = Buffer.from(JWT_SECRET, 'base64');

    try {
      const k1 = await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      info.rawSecretWorks = await crypto.subtle.verify(
        'HMAC',
        k1,
        sig,
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
      );
    } catch {
      info.rawSecretWorks = false;
    }

    try {
      const k2 = await crypto.subtle.importKey(
        'raw',
        b64Key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      info.b64SecretWorks = await crypto.subtle.verify(
        'HMAC',
        k2,
        sig,
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
      );
    } catch {
      info.b64SecretWorks = false;
    }
  }

  res.json(info);
});

export default router;
