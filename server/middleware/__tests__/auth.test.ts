/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { requireRole } from '../requireRole';
import { requireTenant } from '../requireTenant';

function createMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    user: undefined,
    tenantId: undefined,
    profileRole: undefined,
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response & { _status?: number; _body?: unknown } {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => { res._status = code; return res; };
  res.json = (body: unknown) => { res._body = body; return res; };
  return res as unknown as Response & { _status?: number; _body?: unknown };
}

describe('requireRole', () => {
  it('allows admin when admin is in allowed roles', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
      tenantId: 'tenant-1',
      profileRole: 'admin',
    });
    const res = createMockRes();
    let called = false;
    requireRole(['admin'])(req, res, () => { called = true; });
    assert.equal(called, true);
  });

  it('allows direccion when direccion is in allowed roles', () => {
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

  it('rejects user with role not in allowed list', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
      tenantId: 'tenant-1',
      profileRole: 'inspectoria',
    });
    const res = createMockRes();
    requireRole(['admin', 'direccion'])(req, res, () => {});
    assert.equal(res._status, 403);
    assert.equal((res._body as Record<string, string>).error, 'No tiene permisos para realizar esta acción.');
  });

  it('rejects when profileRole is undefined', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
      tenantId: 'tenant-1',
    });
    const res = createMockRes();
    requireRole(['admin'])(req, res, () => {});
    assert.equal(res._status, 403);
    assert.equal((res._body as Record<string, string>).error, 'No fue posible determinar el rol del usuario.');
  });

  it('rejects when tenantId is missing', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
      profileRole: 'admin',
    });
    const res = createMockRes();
    requireRole(['admin'])(req, res, () => {});
    assert.equal(res._status, 403);
    assert.equal((res._body as Record<string, string>).error, 'No fue posible determinar el establecimiento autenticado.');
  });

  it('rejects when user is not authenticated', () => {
    const req = createMockReq();
    const res = createMockRes();
    requireRole(['admin'])(req, res, () => {});
    assert.equal(res._status, 401);
    assert.equal((res._body as Record<string, string>).error, 'Autenticación requerida.');
  });

  it('does not read role from req.user.role', () => {
    const req = createMockReq({
      user: { sub: 'user-1', role: 'admin' },
      tenantId: 'tenant-1',
      profileRole: 'user',
    });
    const res = createMockRes();
    requireRole(['admin'])(req, res, () => {});
    assert.equal(res._status, 403);
  });
});

describe('requireTenant', () => {
  it('allows when tenantId is present', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
      tenantId: 'tenant-1',
    });
    const res = createMockRes();
    let called = false;
    requireTenant(req, res, () => { called = true; });
    assert.equal(called, true);
  });

  it('rejects when tenantId is missing', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
    });
    const res = createMockRes();
    requireTenant(req, res, () => {});
    assert.equal(res._status, 403);
    assert.equal((res._body as Record<string, string>).error, 'No fue posible determinar el establecimiento autenticado.');
  });

  it('rejects when user is not authenticated', () => {
    const req = createMockReq();
    const res = createMockRes();
    requireTenant(req, res, () => {});
    assert.equal(res._status, 401);
    assert.equal((res._body as Record<string, string>).error, 'Autenticación requerida.');
  });
});
