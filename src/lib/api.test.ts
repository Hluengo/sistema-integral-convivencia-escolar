import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import http from 'node:http';
import crypto from 'node:crypto';

// Set up test JWT secret before importing the app
// Use base64-encoded secret to match Supabase format
process.env.SUPABASE_JWT_SECRET = Buffer.from('test-secret-key-for-unit-tests').toString('base64');

/**
 * Create a valid JWT token for testing using HMAC-SHA256
 */
async function createTestJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${headerB64}.${payloadB64}`;

  // Decode base64 secret to match server behavior (Supabase JWT secrets are base64-encoded)
  const secretBytes = Buffer.from(secret, 'base64');
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = Buffer.from(signature).toString('base64url');

  return `${data}.${sigB64}`;
}

describe('API endpoints', () => {
  let server: http.Server;
  let baseUrl: string;
  let VALID_TOKEN: string;

  before(async () => {
    // The base64-encoded secret used for JWT verification
    const b64Secret = process.env.SUPABASE_JWT_SECRET!;
    
    // Create a valid token for the test session
    VALID_TOKEN = await createTestJwt(
      { sub: 'test-user-id', exp: Math.floor(Date.now() / 1000) + 3600 },
      b64Secret
    );

    const mod = await import('../../api/index.js');
    const app = mod.default;
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(() => {
    server?.close();
  });

  function post(path: string, body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<{ status: number; body: Record<string, unknown> | string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const data = JSON.stringify(body);
      const req = http.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
      }, (res) => {
        let chunks = '';
        res.on('data', (c) => chunks += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode || 500, body: JSON.parse(chunks) }); }
          catch { resolve({ status: res.statusCode || 500, body: chunks }); }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  describe('POST /api/improve-text', () => {
    it('returns 401 without auth', async () => {
      const res = await post('/api/improve-text', { text: 'test' });
      assert.equal(res.status, 401);
    });

    it('returns 400 with empty text', async () => {
      const res = await post('/api/improve-text', { text: '' }, {
        Authorization: `Bearer ${VALID_TOKEN}`
      });
      assert.equal(res.status, 400);
    });

    it('returns 400 with text > 5000 chars', async () => {
      const res = await post('/api/improve-text', { text: 'x'.repeat(5001) }, {
        Authorization: `Bearer ${VALID_TOKEN}`
      });
      assert.equal(res.status, 400);
    });
  });

  describe('POST /api/advisor-chat', () => {
    it('returns 401 without auth', async () => {
      const res = await post('/api/advisor-chat', { message: 'test' });
      assert.equal(res.status, 401);
    });

    it('returns 400 with empty message', async () => {
      const res = await post('/api/advisor-chat', { message: '' }, {
        Authorization: `Bearer ${VALID_TOKEN}`
      });
      assert.equal(res.status, 400);
    });
  });

  describe('POST /api/audit-due-process', () => {
    it('returns 401 without auth', async () => {
      const res = await post('/api/audit-due-process', { id: 'DC-2026-001' });
      assert.equal(res.status, 401);
    });

    it('returns 400 without required id', async () => {
      const res = await post('/api/audit-due-process', {}, {
        Authorization: `Bearer ${VALID_TOKEN}`
      });
      assert.equal(res.status, 400);
    });

    it('returns 400 without required infractionType', async () => {
      const res = await post('/api/audit-due-process', { id: 'DC-2026-001' }, {
        Authorization: `Bearer ${VALID_TOKEN}`
      });
      assert.equal(res.status, 400);
    });
  });

  describe('POST /api/draft-document', () => {
    it('returns 401 without auth', async () => {
      const res = await post('/api/draft-document', { docType: 'notificacion_apertura' });
      assert.equal(res.status, 401);
    });

    it('returns 400 without required fields', async () => {
      const res = await post('/api/draft-document', {}, {
        Authorization: `Bearer ${VALID_TOKEN}`
      });
      assert.equal(res.status, 400);
    });

    it('returns 400 with invalid docType', async () => {
      const res = await post('/api/draft-document', {
        docType: 'invalid_type',
        id: 'DC-2026-001',
        studentName: 'Test Student'
      }, {
        Authorization: `Bearer ${VALID_TOKEN}`
      });
      assert.equal(res.status, 400);
    });
  });

  describe('Auth middleware', () => {
    it('rejects expired JWT tokens', async () => {
      const expiredToken = await createTestJwt(
        { sub: 'test-user-id', exp: 1 }, // Expired in 1970
        'test-secret-key-for-unit-tests'
      );
      const res = await post('/api/improve-text', { text: 'test' }, {
        Authorization: `Bearer ${expiredToken}`
      });
      assert.equal(res.status, 401);
    });

    it('rejects malformed JWT tokens', async () => {
      const res = await post('/api/improve-text', { text: 'test' }, {
        Authorization: 'Bearer not-a-jwt-token'
      });
      assert.equal(res.status, 401);
    });

    it('rejects JWT with invalid signature', async () => {
      const res = await post('/api/improve-text', { text: 'test' }, {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.wrong-signature'
      });
      assert.equal(res.status, 401);
    });
  });
});
