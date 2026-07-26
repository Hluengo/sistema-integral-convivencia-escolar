/** @license SPDX-License-Identifier: Apache-2.0 */

import https from 'node:https';

export interface JwkKey {
  kid?: string;
  kty: string;
  alg: string;
  use?: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
}

export interface JwksResponse {
  keys: JwkKey[];
}

interface CacheEntry {
  keys: JwkKey[];
  timestamp: number;
  fetchPromise: Promise<JwkKey[]> | null;
}

const cacheByUrl = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 300_000;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 102_400;

const ALLOWED_ASYMMETRIC_ALGS = new Set(['ES256', 'ES384', 'ES512', 'RS256', 'RS384', 'RS512']);

function getOrCreateCacheEntry(supabaseUrl: string): CacheEntry {
  let entry = cacheByUrl.get(supabaseUrl);
  if (!entry) {
    entry = { keys: [], timestamp: 0, fetchPromise: null };
    cacheByUrl.set(supabaseUrl, entry);
  }
  return entry;
}

function getJwksUrl(supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  return `${base}/auth/v1/.well-known/jwks.json`;
}

function isHttpsAndValidUrl(urlStr: string): URL | null {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function fetchJwksFromServer(supabaseUrl: string): Promise<JwkKey[]> {
  const url = isHttpsAndValidUrl(getJwksUrl(supabaseUrl));
  if (!url) return Promise.reject(new Error('Invalid or non-HTTPS JWKS URL'));

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeout: FETCH_TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        let size = 0;

        res.on('data', (chunk: Buffer | string) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            req.destroy();
            reject(new Error('JWKS response too large'));
            return;
          }
          data += chunk.toString();
        });

        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`JWKS fetch returned ${res.statusCode}`));
          }
          try {
            const parsed = JSON.parse(data) as JwksResponse;
            const keys = (parsed.keys ?? []).filter((k) => k.use === 'sig');
            if (keys.length === 0) {
              return reject(new Error('No signing keys found in JWKS endpoint'));
            }
            resolve(keys);
          } catch {
            reject(new Error('Invalid JWKS response'));
          }
        });
      },
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('JWKS fetch timeout'));
    });
    req.end();
  });
}

export async function getJwksKeys(supabaseUrl: string): Promise<JwkKey[]> {
  const entry = getOrCreateCacheEntry(supabaseUrl);
  const now = Date.now();

  if (entry.keys.length > 0 && now - entry.timestamp < CACHE_TTL_MS) {
    return entry.keys;
  }

  if (entry.fetchPromise) {
    return entry.fetchPromise;
  }

  entry.fetchPromise = fetchJwksFromServer(supabaseUrl)
    .then((keys) => {
      entry.keys = keys;
      entry.timestamp = Date.now();
      entry.fetchPromise = null;
      return keys;
    })
    .catch((err) => {
      entry.fetchPromise = null;
      if (entry.keys.length > 0) {
        return entry.keys;
      }
      throw err;
    });

  return entry.fetchPromise;
}

async function refreshJwksOnce(supabaseUrl: string): Promise<JwkKey[]> {
  const entry = getOrCreateCacheEntry(supabaseUrl);
  entry.timestamp = 0;
  entry.keys = [];
  return getJwksKeys(supabaseUrl);
}

function base64urlToBuffer(b64: string): ArrayBuffer {
  const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = 4 - (b64.length % 4);
  const padded = pad < 4 ? base64 + '='.repeat(pad) : base64;
  const buf = Buffer.from(padded, 'base64');
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  return ab;
}

export function clearJwksCache(supabaseUrl?: string): void {
  if (supabaseUrl) {
    cacheByUrl.delete(supabaseUrl);
  } else {
    cacheByUrl.clear();
  }
}

/** @internal Only for testing */
export function __setJwksTestKeys(supabaseUrl: string, keys: JwkKey[]): void {
  const entry = getOrCreateCacheEntry(supabaseUrl);
  entry.keys = keys;
  entry.timestamp = Date.now();
  entry.fetchPromise = null;
}

/** @internal Only for testing */
export function __getCacheEntry(supabaseUrl: string): { timestamp: number; keys: JwkKey[] } | null {
  const entry = cacheByUrl.get(supabaseUrl);
  if (!entry) return null;
  return { timestamp: entry.timestamp, keys: entry.keys };
}

export async function verifyJwtWithJwks(
  token: string,
  supabaseUrl: string,
): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  let header: { alg?: string; kid?: string; typ?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(base64urlToBuffer(parts[0])));
  } catch {
    return null;
  }

  const alg = header.alg ?? '';
  const kid = header.kid;

  if (alg === 'none') return null;
  if (!ALLOWED_ASYMMETRIC_ALGS.has(alg)) return null;
  if (!kid) return null;

  let keys: JwkKey[];
  try {
    keys = await getJwksKeys(supabaseUrl);
  } catch {
    return null;
  }

  let key = keys.find((k) => k.kid === kid);

  if (!key) {
    try {
      keys = await refreshJwksOnce(supabaseUrl);
      key = keys.find((k) => k.kid === kid);
    } catch {
      return null;
    }
  }

  if (!key) return null;
  if (key.alg !== alg) return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlToBuffer(parts[1])));
  } catch {
    return null;
  }

  const signature = base64urlToBuffer(parts[2]);
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

  try {
    let cryptoKey: CryptoKey;
    let valid: boolean;

    if (key.kty === 'EC') {
      const namedCurve = key.crv === 'P-256' ? 'P-256' : key.crv === 'P-384' ? 'P-384' : key.crv;
      if (!namedCurve) return null;

      const jwk: JsonWebKey = { kty: 'EC', crv: namedCurve, x: key.x!, y: key.y!, ext: true };
      cryptoKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve }, false, [
        'verify',
      ]);
      valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        signature,
        data,
      );
    } else if (key.kty === 'RSA') {
      const jwk: JsonWebKey = { kty: 'RSA', n: key.n!, e: key.e!, alg: key.alg, ext: true };
      cryptoKey = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, data);
    } else {
      return null;
    }

    if (!valid) return null;

    if (payload.exp && typeof payload.exp === 'number' && payload.exp * 1000 < Date.now())
      return null;
    if (payload.nbf && typeof payload.nbf === 'number' && payload.nbf * 1000 > Date.now())
      return null;
    if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    if (payload.iss && typeof payload.iss === 'string') {
      const expectedIss = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
      if (payload.iss !== expectedIss) return null;
    }

    return payload;
  } catch {
    return null;
  }
}
