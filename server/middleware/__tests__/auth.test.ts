/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { before, describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { createRequireAuth, isValidUuid } from '../auth';
import { requireRole } from '../requireRole';
import { requireTenant } from '../requireTenant';
import type { ProfileFetcher } from '../auth';

function createMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    headers: {},
    user: undefined,
    tenantId: undefined,
    profileRole: undefined,
    authToken: undefined,
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response & { _status?: number; _body?: unknown } {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => {
    res._status = code;
    return res;
  };
  res.json = (body: unknown) => {
    res._body = body;
    return res;
  };
  return res as unknown as Response & { _status?: number; _body?: unknown };
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function createJwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

const TEST_JWT_SECRET = 'test-secret-32-bytes-long-for-tests-';
const rejectRemoteToken = async () => null;

function createMockProfileFetcher(
  result: {
    tenantId: string;
    profileRole: string;
  } | null,
): ProfileFetcher {
  return async () => result as { tenantId: string; profileRole: 'admin' } | null;
}

describe('isValidUuid', () => {
  it('accepts a valid UUID', () => {
    assert.equal(isValidUuid('00000000-0000-0000-0000-000000000001'), true);
  });

  it('rejects an empty string', () => {
    assert.equal(isValidUuid(''), false);
  });

  it('rejects a non-uuid string', () => {
    assert.equal(isValidUuid('tenant-1'), false);
  });

  it('accepts a nil UUID', () => {
    assert.equal(isValidUuid('00000000-0000-0000-0000-000000000000'), true);
  });
});

describe('createRequireAuth', () => {
  before(() => {
    process.env.VITE_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('rejects request without authorization header', async () => {
    const req = createMockReq();
    const res = createMockRes();
    let called = false;
    await createRequireAuth(undefined, rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(res._status, 401);
    assert.equal((res._body as Record<string, string>).error, 'Autenticación requerida.');
    assert.equal(called, false);
  });

  it('rejects malformed token', async () => {
    const req = createMockReq({ headers: { authorization: 'Bearer short' } });
    const res = createMockRes();
    let called = false;
    await createRequireAuth(undefined, rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });

  it('rejects invalid JWT signature', async () => {
    const token = createJwt({ sub: 'user-123' }, 'different-secret');
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    let called = false;
    await createRequireAuth(undefined, rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });

  it('rejects expired JWT', async () => {
    const token = createJwt(
      { sub: 'user-123', exp: Math.floor(Date.now() / 1000) - 60 },
      TEST_JWT_SECRET,
    );
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    let called = false;
    await createRequireAuth(undefined, rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });

  it('rejects JWT signed with empty secret (HMAC disabled)', async () => {
    // Un token auto-firmado con clave vacía no debe validarse cuando no hay
    // SUPABASE_JWT_SECRET configurado (C1: HMAC con secret vacío).
    const token = createJwt({ sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 }, '');
    process.env.SUPABASE_JWT_SECRET = '';
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    let called = false;
    await createRequireAuth(undefined, rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });

  it('rejects JWT without exp claim (must be mandatory)', async () => {
    const token = createJwt({ sub: 'user-123' }, TEST_JWT_SECRET);
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    let called = false;
    await createRequireAuth(undefined, rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });

  it('rejects authenticated user without an active profile', async () => {
    const token = createJwt(
      { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_JWT_SECRET,
    );
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    let called = false;
    await createRequireAuth(createMockProfileFetcher(null), rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(res._status, 403);
    assert.equal(
      (res._body as Record<string, string>).error,
      'No fue posible determinar el establecimiento autenticado. Verifique que su perfil esté activo.',
    );
    assert.equal(called, false);
  });

  it('rejects authenticated user with an invalid tenant id', async () => {
    const token = createJwt(
      { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_JWT_SECRET,
    );
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    let called = false;
    const fetcher = createMockProfileFetcher({ tenantId: 'not-a-uuid', profileRole: 'admin' });
    await createRequireAuth(fetcher, rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(res._status, 403);
    assert.equal(called, false);
  });

  it('allows authenticated user with valid profile and tenant', async () => {
    const token = createJwt(
      { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_JWT_SECRET,
    );
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    let called = false;
    const fetcher = createMockProfileFetcher({
      tenantId: '00000000-0000-0000-0000-000000000001',
      profileRole: 'admin',
    });
    await createRequireAuth(fetcher, rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal((req as { tenantId?: string }).tenantId, '00000000-0000-0000-0000-000000000001');
    assert.equal((req as { profileRole?: string }).profileRole, 'admin');
    assert.equal((req as { authToken?: string }).authToken, token);
  });

  it('does not trust privileged role from stale JWT metadata', async () => {
    const token = createJwt(
      {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        app_metadata: {
          tenant_id: '00000000-0000-0000-0000-000000000001',
          role: 'admin',
        },
      },
      TEST_JWT_SECRET,
    );
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    let fetcherCalled = false;
    const fetcher = async () => {
      fetcherCalled = true;
      return {
        tenantId: '00000000-0000-0000-0000-000000000001',
        profileRole: 'teacher' as const,
      };
    };

    await createRequireAuth(fetcher, rejectRemoteToken)(req, res, () => {});

    assert.equal(fetcherCalled, true);
    assert.equal((req as { profileRole?: string }).profileRole, 'teacher');
  });

  it('ignores tenant id sent in request body and uses profile tenant', async () => {
    const token = createJwt(
      { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_JWT_SECRET,
    );
    process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;
    const req = createMockReq({
      headers: { authorization: `Bearer ${token}` },
      body: { tenantId: '11111111-1111-1111-1111-111111111111' },
    });
    const res = createMockRes();
    let called = false;
    const fetcher = createMockProfileFetcher({
      tenantId: '00000000-0000-0000-0000-000000000001',
      profileRole: 'admin',
    });
    await createRequireAuth(fetcher, rejectRemoteToken)(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
    assert.equal((req as { tenantId?: string }).tenantId, '00000000-0000-0000-0000-000000000001');
  });
});

describe('requireRole', () => {
  it('allows admin when admin is in allowed roles', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
      tenantId: 'tenant-1',
      profileRole: 'admin',
    });
    const res = createMockRes();
    let called = false;
    requireRole(['admin'])(req, res, () => {
      called = true;
    });
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
    requireRole(['admin', 'direccion'])(req, res, () => {
      called = true;
    });
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
    assert.equal(
      (res._body as Record<string, string>).error,
      'No tiene permisos para realizar esta acción.',
    );
  });

  it('rejects when profileRole is undefined', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
      tenantId: 'tenant-1',
    });
    const res = createMockRes();
    requireRole(['admin'])(req, res, () => {});
    assert.equal(res._status, 403);
    assert.equal(
      (res._body as Record<string, string>).error,
      'No fue posible determinar el rol del usuario.',
    );
  });

  it('rejects when tenantId is missing', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
      profileRole: 'admin',
    });
    const res = createMockRes();
    requireRole(['admin'])(req, res, () => {});
    assert.equal(res._status, 403);
    assert.equal(
      (res._body as Record<string, string>).error,
      'No fue posible determinar el establecimiento autenticado.',
    );
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
    requireTenant(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
  });

  it('rejects when tenantId is missing', () => {
    const req = createMockReq({
      user: { sub: 'user-1' },
    });
    const res = createMockRes();
    requireTenant(req, res, () => {});
    assert.equal(res._status, 403);
    assert.equal(
      (res._body as Record<string, string>).error,
      'No fue posible determinar el establecimiento autenticado.',
    );
  });

  it('rejects when user is not authenticated', () => {
    const req = createMockReq();
    const res = createMockRes();
    requireTenant(req, res, () => {});
    assert.equal(res._status, 401);
    assert.equal((res._body as Record<string, string>).error, 'Autenticación requerida.');
  });
});
