import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import http from 'node:http';

describe('API endpoints', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
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

  const VALID_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature';

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
      const res = await post('/api/improve-text', { text: 'test' }, {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.invalid'
      });
      assert.equal(res.status, 401);
    });

    it('rejects malformed JWT tokens', async () => {
      const res = await post('/api/improve-text', { text: 'test' }, {
        Authorization: 'Bearer not-a-jwt-token'
      });
      assert.equal(res.status, 401);
    });
  });
});
