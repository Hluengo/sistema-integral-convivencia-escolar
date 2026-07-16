import { Router } from 'express';
import crypto from 'node:crypto';
import https from 'node:https';

const router = Router();

// Note: This endpoint re-exports internal functions for use in tests.
// The original implementations are in ../middleware/auth.js

async function verifyJwtViaHmac(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  const signature = Buffer.from(parts[2], 'base64url');

  for (const secretBytes of [new TextEncoder().encode(secret), Buffer.from(secret, 'base64')]) {
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const valid = await crypto.subtle.verify('HMAC', key, signature, data);
      if (valid) {
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return null;
        }
        return payload;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function verifyViaSupabaseApi(token) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
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
      (res2) => {
        let data = '';
        res2.on('data', (chunk) => {
          data += chunk;
        });
        res2.on('end', () => {
          if (res2.statusCode !== 200) {
            return resolve(null);
          }
          try {
            const user = JSON.parse(data);
            resolve({ sub: user.id, email: user.email, role: user.role });
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

async function verifyJwtSignature(token, secret) {
  const hmacResult = await verifyJwtViaHmac(token, secret);
  if (hmacResult) {
    return hmacResult;
  }
  return verifyViaSupabaseApi(token);
}

router.get('/auth-debug', async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

  const info = {
    hasToken: token.length > 10,
    hasSecret: !!JWT_SECRET,
    secretLength: JWT_SECRET ? JWT_SECRET.length : 0,
    tokenParts: token.split('.').length,
  };

  if (info.hasToken && info.hasSecret) {
    const payload = await verifyJwtSignature(token, JWT_SECRET);
    info.verified = !!payload;
    info.userId = payload?.sub;
    info.email = payload?.email;

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
        ['verify']
      );
      info.rawSecretWorks = await crypto.subtle.verify(
        'HMAC',
        k1,
        sig,
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
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
        ['verify']
      );
      info.b64SecretWorks = await crypto.subtle.verify(
        'HMAC',
        k2,
        sig,
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
      );
    } catch {
      info.b64SecretWorks = false;
    }
  }

  res.json(info);
});

export default router;
