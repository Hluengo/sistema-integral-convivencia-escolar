/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it, before, after, beforeEach } from 'node:test';
import { verifyJwtWithJwks, clearJwksCache, __setJwksTestKeys, __getCacheEntry } from '../jwks';
import type { JwkKey } from '../jwks';

const SUPABASE_URL = 'https://jjzwwhnofiepvliugowr.supabase.co';

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function derToRawSignature(der: Buffer, curveSize: number): Buffer {
  let i = 0;
  if (der[i++] !== 0x30) throw new Error('Not SEQUENCE');
  if (der[i] & 0x80) {
    i += (der[i] & 0x7f) + 1;
  } else {
    i += 1;
  }
  if (der[i++] !== 0x02) throw new Error('Expected INTEGER for R');
  const rLen = der[i++];
  const rStart = i;
  i += rLen;
  if (der[i++] !== 0x02) throw new Error('Expected INTEGER for S');
  const sLen = der[i++];
  const sStart = i;

  let r = der.subarray(rStart, rStart + rLen);
  let s = der.subarray(sStart, sStart + sLen);

  if (r.length > curveSize && r[0] === 0x00) r = r.subarray(1);
  if (s.length > curveSize && s[0] === 0x00) s = s.subarray(1);

  const rawR = Buffer.alloc(curveSize);
  r.copy(rawR, curveSize - r.length);
  const rawS = Buffer.alloc(curveSize);
  s.copy(rawS, curveSize - s.length);

  return Buffer.concat([rawR, rawS]);
}

function generateTestKeypair(): { publicJwk: JwkKey; privateKey: crypto.KeyObject; kid: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });
  const jwk = publicKey.export({ format: 'jwk' });
  const kid = 'test-kid-p256-001';
  const publicJwk: JwkKey = {
    kid,
    kty: 'EC',
    alg: 'ES256',
    use: 'sig',
    crv: 'P-256',
    x: jwk.x!,
    y: jwk.y!,
  };
  return { publicJwk, privateKey, kid };
}

function createSignedJwt(
  payload: Record<string, unknown>,
  privateKey: crypto.KeyObject,
  kid: string,
  headerOverrides?: Record<string, string>,
): string {
  const header = { alg: 'ES256', kid, typ: 'JWT', ...headerOverrides };
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const derSig = sign.sign(privateKey);
  const rawSig = derToRawSignature(derSig, 32);

  return `${headerB64}.${payloadB64}.${base64url(rawSig)}`;
}

describe('verifyJwtWithJwks — security & positive tests', () => {
  let keypair: { publicJwk: JwkKey; privateKey: crypto.KeyObject; kid: string };

  before(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    keypair = generateTestKeypair();
    clearJwksCache();
  });

  after(() => {
    clearJwksCache();
  });

  it('1. positive ES256 — verifies payload with real EC P-256 keypair', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: `${SUPABASE_URL}/auth/v1`,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);

    assert.notEqual(result, null);
    assert.equal(result!.sub, 'user-abc-123');
    assert.equal(result!.exp, payload.exp);
    assert.equal(result!.iss, payload.iss);
  });

  it('2. ES256 — altered signature returns null', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: `${SUPABASE_URL}/auth/v1`,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const parts = token.split('.');

    const sigBuf = Buffer.from(parts[2]!, 'base64url');
    sigBuf[0] ^= 0x01;
    const alteredToken = `${parts[0]}.${parts[1]}.${base64url(sigBuf)}`;

    const result = await verifyJwtWithJwks(alteredToken, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('3. ES256 — wrong issuer returns null', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://evil.com/auth/v1',
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('4. ES256 — issuer missing is accepted (optional)', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.notEqual(result, null);
    assert.equal(result!.sub, 'user-abc-123');
  });

  it('5. ES256 — exp in the past returns null', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) - 3600,
      iss: `${SUPABASE_URL}/auth/v1`,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('6. ES256 — nbf in the future returns null', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) + 7200,
      nbf: Math.floor(Date.now() / 1000) + 3600,
      iss: `${SUPABASE_URL}/auth/v1`,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('7. ES256 — nbf in the past is accepted', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
      nbf: Math.floor(Date.now() / 1000) - 60,
      iss: `${SUPABASE_URL}/auth/v1`,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.notEqual(result, null);
    assert.equal(result!.sub, 'user-abc-123');
  });

  it('8. ES256 — empty sub returns null', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: '',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('9. ES256 — missing sub returns null', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('10. ES256 — RS256 token with ES256 key rejects (alg mismatch)', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid, {
      alg: 'RS256',
    });
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('11. ES256 — alg=none rejected', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const header = { alg: 'none', kid: keypair.kid, typ: 'JWT' };
    const payload = { sub: 'user-abc-123', exp: Math.floor(Date.now() / 1000) + 3600 };
    const token = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(Buffer.from(JSON.stringify(payload)))}.`;
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('12. ES256 — unknown algorithm rejected', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const header = { alg: 'foo256', kid: keypair.kid, typ: 'JWT' };
    const payload = { sub: 'user-abc-123', exp: Math.floor(Date.now() / 1000) + 3600 };
    const token = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(Buffer.from(JSON.stringify(payload)))}.fake`;
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('13. ES256 — kid mismatch with JWKS key returns null (checks refresh)', async () => {
    const otherKeypair = generateTestKeypair();
    __setJwksTestKeys(SUPABASE_URL, [otherKeypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('14. cache is used for second call', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const payload = {
      sub: 'user-abc-123',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: `${SUPABASE_URL}/auth/v1`,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);

    const result1 = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.notEqual(result1, null);

    // Second call should hit cache
    const result2 = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.notEqual(result2, null);

    // Cache entry should exist
    const entry = __getCacheEntry(SUPABASE_URL);
    assert.notEqual(entry, null);
    assert.equal(entry!.keys.length, 1);
    assert.equal(entry!.keys[0]!.kid, keypair.kid);
  });

  it('15. malformed token (2 parts) returns null', async () => {
    const result = await verifyJwtWithJwks('a.b', SUPABASE_URL);
    assert.equal(result, null);
  });

  it('16. ES256 without kid returns null', async () => {
    const header = base64url(Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })));
    const payload = base64url(Buffer.from(JSON.stringify({ sub: 'test' })));
    const token = `${header}.${payload}.fake`;
    const result = await verifyJwtWithJwks(token, SUPABASE_URL);
    assert.equal(result, null);
  });

  it('17. cache evita fetch repetido — same keys after clear', async () => {
    __setJwksTestKeys(SUPABASE_URL, [keypair.publicJwk]);

    const entryBefore = __getCacheEntry(SUPABASE_URL);
    assert.notEqual(entryBefore, null);
    assert.equal(entryBefore!.keys.length, 1);

    const payload = {
      sub: 'user-cache-test',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const token = createSignedJwt(payload, keypair.privateKey, keypair.kid);

    await verifyJwtWithJwks(token, SUPABASE_URL);

    const entryAfter = __getCacheEntry(SUPABASE_URL);
    assert.notEqual(entryAfter, null);
    assert.ok(entryAfter!.timestamp >= entryBefore!.timestamp);
  });
});
