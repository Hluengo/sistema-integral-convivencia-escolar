/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import type { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Fakes de middlewares y Supabase para ejercitar los handlers de la ruta.
// ---------------------------------------------------------------------------
await mock.module('../../../middleware/auth.js', {
  namedExports: { requireAuth: (req: Request, _res: Response, next: () => void) => next() },
});
await mock.module('../../../middleware/requireSuperAdmin.js', {
  namedExports: { requireSuperAdmin: (req: Request, _res: Response, next: () => void) => next() },
});

let tableHandler: (
  table: string,
  calls: string[],
) => { data: unknown; error: { message: string } | null; count?: number | null };
let rpcHandler: (
  fn: string,
  params?: unknown,
) => Promise<{ data: unknown; error: { message: string } | null }>;

await mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: () => fakeSupabaseClient(tableHandler, rpcHandler) as unknown,
  },
});

const { default: platformRouter } = await import('../platform.js');

process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

function fakeSupabaseClient(
  handler: (table: string, calls: string[]) => unknown,
  rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: unknown }>,
) {
  const builder = (table: string) => {
    const calls: string[] = [];
    const record = (method: string, field?: string) => {
      calls.push(field === undefined ? method : `${method}:${field}`);
      return api;
    };
    const api = {
      select: (...args: unknown[]) => {
        const opts = args[1] as { count?: string } | undefined;
        return opts?.count ? record('count') : record('select');
      },
      eq: (field: string) => record('eq', field),
      maybeSingle: (..._args: unknown[]) => record('maybeSingle'),
      order: (field: string) => record('order', field),
      then: async (onFulfilled?: (value: unknown) => unknown) => {
        const result = handler(table, calls);
        return onFulfilled ? onFulfilled(result) : result;
      },
    };
    return api;
  };

  return {
    from: builder,
    rpc: async (fn: string, params?: unknown) => rpc(fn, params),
  };
}

function createReq(overrides: Record<string, unknown> = {}): Request {
  return {
    method: 'GET',
    url: '/platform/tenants',
    headers: {},
    params: {},
    query: {},
    body: {},
    user: { sub: 'super-1' },
    tenantId: 'tenant-1',
    profileRole: 'superadmin',
    ...overrides,
  } as unknown as Request;
}

function createRes(): Response & { _status?: number; _body?: unknown; _ended?: boolean } {
  const res: Record<string, unknown> = {};
  res.status = (code: number) => {
    res._status = code;
    return res;
  };
  res.json = (body: unknown) => {
    res._body = body;
    res._ended = true;
    return res;
  };
  res.setHeader = () => res;
  res.end = () => {
    res._ended = true;
    return res;
  };
  res.send = (body: unknown) => {
    res._body = body;
    res._ended = true;
    return res;
  };
  return res as unknown as Response & { _status?: number; _body?: unknown; _ended?: boolean };
}

function handle(
  app: (req: Request, res: Response, next?: () => void) => void,
  req: Request,
  res: Response,
) {
  return new Promise<void>((resolve) => {
    const finish = () => resolve();
    const timer = setTimeout(finish, 500);
    (res as unknown as { end: () => unknown }).end = () => {
      clearTimeout(timer);
      finish();
      return res;
    };
    app(req, res, finish);
    if ((res as unknown as { _ended?: boolean })._ended) {
      clearTimeout(timer);
      finish();
    }
  });
}

test('GET /platform/tenants usa la RPC agregada cuando está disponible', async () => {
  tableHandler = (table, calls) => {
    if (table === 'profiles' && calls.includes('eq:user_id')) {
      return {
        data: { user_id: 'super-1', role: 'superadmin', is_active: true, tenant_id: 'tenant-1' },
        error: null,
      };
    }
    if (table === 'tenants') {
      return {
        data: [
          { id: 'tenant-1', name: 'Colegio Uno', slug: 'colegio-uno', created_at: '2026-01-01' },
          { id: 'tenant-2', name: 'Colegio Dos', slug: 'colegio-dos', created_at: '2026-01-02' },
        ],
        error: null,
      };
    }
    return { data: null, error: null };
  };
  rpcHandler = async () => ({
    data: [
      { tenant_id: 'tenant-1', user_count: 5 },
      { tenant_id: 'tenant-2', user_count: 8 },
    ],
    error: null,
  });

  const req = createReq({ method: 'GET', url: '/platform/tenants' });
  const res = createRes();
  await handle(platformRouter as unknown as (req: Request, res: Response) => void, req, res);

  const tenants = (res._body as { tenants?: Array<{ id: string; user_count: number }> })?.tenants;
  assert.equal(tenants?.length, 2);
  assert.equal(tenants?.[0]?.user_count, 5);
  assert.equal(tenants?.[1]?.user_count, 8);
});

test('GET /platform/tenants degrada al conteo individual si la RPC falla', async () => {
  let rpcCalls = 0;
  let profileCalls = 0;
  tableHandler = (table, calls) => {
    if (table === 'profiles' && calls.includes('eq:user_id')) {
      return {
        data: { user_id: 'super-1', role: 'superadmin', is_active: true, tenant_id: 'tenant-1' },
        error: null,
      };
    }
    if (table === 'tenants') {
      return {
        data: [
          { id: 'tenant-1', name: 'Colegio Uno', slug: 'colegio-uno', created_at: '2026-01-01' },
        ],
        error: null,
      };
    }
    if (table === 'profiles' && calls.includes('count')) {
      profileCalls += 1;
      return { data: null, count: 3, error: null };
    }
    return { data: null, error: null };
  };
  rpcHandler = async () => {
    rpcCalls += 1;
    return { data: null, error: { message: 'rpc not found' } };
  };

  const req = createReq({ method: 'GET', url: '/platform/tenants' });
  const res = createRes();
  await handle(platformRouter as unknown as (req: Request, res: Response) => void, req, res);

  const tenants = (res._body as { tenants?: Array<{ id: string; user_count: number }> })?.tenants;
  assert.equal(tenants?.[0]?.user_count, 3);
  assert.ok(rpcCalls === 1);
  assert.ok(profileCalls >= 1);
});

test('GET /platform/tenants rechaza cuando el superadmin no está activo', async () => {
  tableHandler = (table) => {
    if (table === 'profiles') {
      return {
        data: { user_id: 'super-1', role: 'staff', is_active: false, tenant_id: 'tenant-1' },
        error: null,
      };
    }
    return { data: null, error: null };
  };
  rpcHandler = async () => ({ data: null, error: { message: 'rpc not found' } });

  const req = createReq({ method: 'GET', url: '/platform/tenants' });
  const res = createRes();
  await handle(platformRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal(res._status, 403);
  assert.match((res._body as { error?: string })?.error ?? '', /superadministrador/);
});
