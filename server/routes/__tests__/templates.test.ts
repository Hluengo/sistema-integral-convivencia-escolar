/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireTenant } from '../../middleware/requireTenant';
import { requireRole } from '../../middleware/requireRole';

function createMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    user: undefined,
    tenantId: undefined,
    profileRole: undefined,
    headers: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response & { _status?: number; _body?: unknown } {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => { res._status = code; return res; };
  res.json = (body: unknown) => { res._body = body; return res; };
  res.setHeader = () => res;
  return res as unknown as Response & { _status?: number; _body?: unknown };
}

describe('Templates middleware chain', () => {
  describe('GET /document-templates (public)', () => {
    it('rejects without auth', () => {
      const req = createMockReq();
      const res = createMockRes();
      requireAuth(req, res, () => {});
      assert.equal(res._status, 401);
    });

    it('rejects without tenant', () => {
      const req = createMockReq({
        user: { sub: 'user-1' },
      });
      const res = createMockRes();
      requireTenant(req, res, () => {});
      assert.equal(res._status, 403);
    });

    it('allows with auth and tenant', () => {
      const req = createMockReq({
        user: { sub: 'user-1' },
        tenantId: 'tenant-1',
      });
      const res = createMockRes();
      let called = false;
      requireTenant(req, res, () => { called = true; });
      assert.equal(called, true);
    });
  });

  describe('GET /document-templates/admin', () => {
    it('rejects without auth', () => {
      const req = createMockReq();
      const res = createMockRes();
      requireAuth(req, res, () => {});
      assert.equal(res._status, 401);
    });

    it('rejects user with role user', () => {
      const req = createMockReq({
        user: { sub: 'user-1' },
        tenantId: 'tenant-1',
        profileRole: 'user',
      });
      const res = createMockRes();
      requireRole(['admin', 'direccion'])(req, res, () => {});
      assert.equal(res._status, 403);
    });

    it('allows admin', () => {
      const req = createMockReq({
        user: { sub: 'user-1' },
        tenantId: 'tenant-1',
        profileRole: 'admin',
      });
      const res = createMockRes();
      let called = false;
      requireRole(['admin', 'direccion'])(req, res, () => { called = true; });
      assert.equal(called, true);
    });

    it('allows direccion', () => {
      const req = createMockReq({
        user: { sub: 'user-1' },
        tenantId: 'tenant-1',
        profileRole: 'direccion',
      });
      const res = createMockRes();
      let called = false;
      requireRole(['admin', 'direccion'])(req, res, () => { called = true; });
      assert.equal(called, true);
    });
  });

  describe('PUT /document-templates', () => {
    it('rejects without auth', () => {
      const req = createMockReq();
      const res = createMockRes();
      requireAuth(req, res, () => {});
      assert.equal(res._status, 401);
    });

    it('rejects user with role inspectoria', () => {
      const req = createMockReq({
        user: { sub: 'user-1' },
        tenantId: 'tenant-1',
        profileRole: 'inspectoria',
      });
      const res = createMockRes();
      requireRole(['admin', 'direccion'])(req, res, () => {});
      assert.equal(res._status, 403);
    });

    it('allows admin with valid tenant', () => {
      const req = createMockReq({
        user: { sub: 'user-1' },
        tenantId: 'tenant-1',
        profileRole: 'admin',
      });
      const res = createMockRes();
      let tenantOk = false;
      let roleOk = false;
      requireTenant(req, res, () => {
        tenantOk = true;
        requireRole(['admin', 'direccion'])(req, res, () => { roleOk = true; });
      });
      assert.equal(tenantOk, true);
      assert.equal(roleOk, true);
    });
  });

  describe('Tenant isolation', () => {
    it('tenant A admin cannot become tenant B admin', () => {
      const req = createMockReq({
        user: { sub: 'user-1' },
        tenantId: 'tenant-A',
        profileRole: 'admin',
      });
      const res = createMockRes();
      requireTenant(req, res, () => {});
      assert.equal((req as unknown as Record<string, unknown>).tenantId, 'tenant-A');
      assert.notEqual((req as unknown as Record<string, unknown>).tenantId, 'tenant-B');
    });
  });
});
