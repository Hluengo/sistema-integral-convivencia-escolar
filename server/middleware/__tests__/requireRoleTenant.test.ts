/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { requireRole } from '../requireRole';
import { requireTenant } from '../requireTenant';
import type { AuthenticatedRequest } from '../../types';

function makeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

function makeReq(overrides: Partial<AuthenticatedRequest> = {}) {
  return {
    user: undefined,
    tenantId: undefined,
    profileRole: undefined,
    ...overrides,
  } as Request;
}

test('requireTenant responde 401 sin usuario autenticado', () => {
  const req = makeReq();
  const res = makeRes();
  requireTenant(req, res, () => assert.fail('no debería continuar'));
  assert.equal(res.statusCode, 401);
});

test('requireTenant responde 403 sin tenantId', () => {
  const req = makeReq({ user: { sub: 'u1' } } as Partial<AuthenticatedRequest>);
  const res = makeRes();
  requireTenant(req, res, () => assert.fail('no debería continuar'));
  assert.equal(res.statusCode, 403);
});

test('requireTenant continúa con usuario y tenant válidos', () => {
  const req = makeReq({ user: { sub: 'u1' }, tenantId: 't1' } as Partial<AuthenticatedRequest>);
  const res = makeRes();
  let called = false;
  requireTenant(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test('requireRole responde 401 sin usuario autenticado', () => {
  const req = makeReq();
  const res = makeRes();
  const middleware = requireRole(['admin']);
  middleware(req, res, () => assert.fail('no debería continuar'));
  assert.equal(res.statusCode, 401);
});

test('requireRole responde 403 sin rol del usuario', () => {
  const req = makeReq({ user: { sub: 'u1' }, tenantId: 't1' } as Partial<AuthenticatedRequest>);
  const res = makeRes();
  const middleware = requireRole(['admin']);
  middleware(req, res, () => assert.fail('no debería continuar'));
  assert.equal(res.statusCode, 403);
  assert.equal(
    (res.body as { error: string }).error,
    'No fue posible determinar el rol del usuario.',
  );
});

test('requireRole responde 403 si el rol no está permitido', () => {
  const req = makeReq({
    user: { sub: 'u1' },
    tenantId: 't1',
    profileRole: 'inspector',
  } as Partial<AuthenticatedRequest>);
  const res = makeRes();
  const middleware = requireRole(['admin', 'direccion']);
  middleware(req, res, () => assert.fail('no debería continuar'));
  assert.equal(res.statusCode, 403);
});

test('requireRole continúa si el rol está permitido', () => {
  const req = makeReq({
    user: { sub: 'u1' },
    tenantId: 't1',
    profileRole: 'admin',
  } as Partial<AuthenticatedRequest>);
  const res = makeRes();
  let called = false;
  const middleware = requireRole(['admin', 'direccion']);
  middleware(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test('requireRole no permite un rol no autorizado incluso con tenant', () => {
  const req = makeReq({
    user: { sub: 'u1' },
    tenantId: 't1',
    profileRole: 'teacher',
  } as Partial<AuthenticatedRequest>);
  const res = makeRes();
  const middleware = requireRole(['admin']);
  middleware(req, res, () => assert.fail('no debería continuar'));
  assert.equal(res.statusCode, 403);
});
