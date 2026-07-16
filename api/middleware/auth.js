import crypto from 'node:crypto';
import https from 'node:https';

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
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) {
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

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida.' });
  }
  const token = authHeader.replace('Bearer ', '');
  if (token.length < 10) {
    return res.status(401).json({ error: 'Token inválido.' });
  }

  const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
  if (!JWT_SECRET) {
    console.error('SUPABASE_JWT_SECRET no configurada');
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  try {
    const payload = await verifyJwtSignature(token, JWT_SECRET);
    if (!payload) {
      return res.status(401).json({ error: 'Token JWT inválido o expirado.' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token JWT inválido.' });
  }
}
