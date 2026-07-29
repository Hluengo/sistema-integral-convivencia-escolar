/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import type { Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireTenant } from '../../middleware/requireTenant';
import { requireMembership } from '../../middleware/requireMembership';

function createMockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    user: undefined,
    tenantId: undefined,
    profileRole: undefined,
    authToken: undefined,
    headers: {},
    body: {},
    query: {},
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
  res.setHeader = () => res;
  return res as unknown as Response & { _status?: number; _body?: unknown };
}

describe('Pilot route — GET /pilot/membership-check', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.VITE_APP_MEMBERSHIPS_ENABLED;
    delete process.env.VITE_APP_MEMBERSHIPS_ENFORCED;
  });

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

  it('allows in legacy mode (flag disabled) with valid profile role', () => {
    process.env.VITE_APP_MEMBERSHIPS_ENABLED = 'false';
    const req = createMockReq({
      user: { sub: 'user-1' },
      tenantId: 'tenant-1',
      profileRole: 'direccion',
    });
    const res = createMockRes();
    let called = false;
    requireMembership({
      applicationCode: 'convivencia',
      allowedRoles: ['direccion', 'convivencia'],
    })(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
  });

  it('denies in legacy mode with wrong profile role', () => {
    process.env.VITE_APP_MEMBERSHIPS_ENABLED = 'false';
    const req = createMockReq({
      user: { sub: 'user-1' },
      tenantId: 'tenant-1',
      profileRole: 'teacher',
    });
    const res = createMockRes();
    requireMembership({
      applicationCode: 'convivencia',
      allowedRoles: ['direccion', 'convivencia'],
    })(req, res, () => {});
    assert.equal(res._status, 403);
  });

  it('falls back to profile role in transition mode when membership denied', async () => {
    process.env.VITE_APP_MEMBERSHIPS_ENABLED = 'true';
    process.env.VITE_APP_MEMBERSHIPS_ENFORCED = 'false';
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
    const req = createMockReq({
      user: { sub: 'user-1' },
      tenantId: 'tenant-1',
      profileRole: 'direccion',
      authToken: 'fake-token',
    });
    const res = createMockRes();
    let called = false;
    await requireMembership(
      {
        applicationCode: 'convivencia',
        allowedRoles: ['direccion', 'convivencia'],
      },
      async () => false,
    )(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
  });
});
