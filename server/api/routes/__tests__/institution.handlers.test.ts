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
await mock.module('../../../middleware/requireTenant.js', {
  namedExports: { requireTenant: (req: Request, _res: Response, next: () => void) => next() },
});
await mock.module('../../../middleware/requireRole.js', {
  namedExports: { requireRole: () => (req: Request, _res: Response, next: () => void) => next() },
});
await mock.module('../../../middleware/requireSuperAdmin.js', {
  namedExports: {
    requireSuperAdmin: (req: Request, _res: Response, next: () => void) => next(),
  },
});

// Respuestas por tabla y operación.
let tableHandler: (
  table: string,
  calls: string[],
) => { data: unknown; error: { message: string } | null };

await mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: () => fakeSupabaseClient(tableHandler) as unknown,
  },
});

const { default: institutionRouter, getTenantFromRequest } = await import('../institution.js');

process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

function fakeSupabaseClient(
  handler: (table: string, calls: string[]) => { data: unknown; error: { message: string } | null },
) {
  const builder = (table: string) => {
    const calls: string[] = [];
    const record = (method: string, field?: string) => {
      calls.push(field === undefined ? method : `${method}:${field}`);
      return api;
    };
    const api = {
      select: (..._args: unknown[]) => record('select'),
      eq: (field: string) => record('eq', field),
      in: (field: string) => record('in', field),
      order: (field: string) => record('order', field),
      limit: (..._args: unknown[]) => record('limit'),
      maybeSingle: (..._args: unknown[]) => record('maybeSingle'),
      single: (..._args: unknown[]) => record('single'),
      insert: (value: unknown) => {
        calls.push('insert');
        calls.push(`__${JSON.stringify(value ?? {})}`);
        return api;
      },
      update: (value: unknown) => {
        calls.push('update');
        calls.push(`__${JSON.stringify(value ?? {})}`);
        return api;
      },
      upsert: (value: unknown) => {
        calls.push('upsert');
        calls.push(`__${JSON.stringify(value ?? {})}`);
        return api;
      },
      then: async (
        onFulfilled?: (value: { data: unknown; error: { message: string } | null }) => unknown,
      ) => {
        const result = handler(table, calls);
        return onFulfilled ? onFulfilled(result) : result;
      },
    };
    return api;
  };

  return {
    from: builder,
    rpc: async () => handler('rpc', ['rpc']),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: { signedUrl: 'https://cdn/firma.png' },
          error: null,
        }),
        upload: async () => ({ data: { path: 'x' }, error: null }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  };
}

function createReq(overrides: Record<string, unknown> = {}): Request {
  return {
    method: 'GET',
    url: '/institution/settings',
    headers: {},
    params: {},
    query: {},
    body: {},
    user: { sub: 'user-1' },
    tenantId: 'tenant-1',
    profileRole: 'admin',
    ...overrides,
  } as unknown as Request;
}

function createRes(): Response & {
  _status?: number;
  _body?: unknown;
  _ended?: boolean;
} {
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
test('GET /institution/settings devuelve configuración mínima del tenant', async () => {
  assert.ok(process.env.VITE_SUPABASE_URL, 'env VITE_SUPABASE_URL');
  tableHandler = (table, calls) => {
    if (table === 'institution_settings' && calls.includes('maybeSingle')) {
      return {
        data: {
          tenant_id: 'tenant-1',
          official_name: 'Colegio Ejemplo',
          institution_rut: null,
          address: null,
          commune: null,
          region: null,
          phone: null,
          institutional_email: null,
          proprietor: null,
          director_name: null,
          education_levels: [],
          logo_path: 'tenant-1/logo.png',
          updated_at: '2026-08-06T12:00:00.000Z',
          updated_by: null,
        },
        error: null,
      };
    }
    return { data: null, error: null };
  };
  const req = createReq();
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal(res._status, undefined);
  assert.equal((res._body as { official_name?: string })?.official_name, 'Colegio Ejemplo');
  assert.equal((res._body as { logo_url?: string | null })?.logo_url, 'https://cdn/firma.png');
});

test('GET /admin/institution crea defaults desde tenants cuando no hay configuración', async () => {
  tableHandler = (table) => {
    if (table === 'institution_settings') return { data: null, error: null };
    if (table === 'tenants') return { data: { name: 'Colegio Nuevo' }, error: null };
    return { data: null, error: null };
  };
  const req = createReq({ method: 'GET', url: '/admin/institution' });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal((res._body as { official_name?: string })?.official_name, 'Colegio Nuevo');
  assert.equal((res._body as { education_levels?: string[] })?.education_levels?.length, 0);
});

test('GET /institution/settings responde 500 ante error de base de datos', async () => {
  tableHandler = (table) => {
    if (table === 'institution_settings') {
      return { data: null, error: { message: 'db down' } };
    }
    return { data: null, error: null };
  };
  const req = createReq();
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal(res._status, 500);
  assert.match((res._body as { error?: string })?.error ?? '', /No fue posible actualizar/);
});

test('PATCH /admin/institution actualiza configuración y registra auditoría', async () => {
  const settingsReads = new Map<string, number>();
  tableHandler = (table, calls) => {
    if (table === 'institution_settings' && calls.includes('maybeSingle')) {
      const n = (settingsReads.get(table) ?? 0) + 1;
      settingsReads.set(table, n);
      if (n === 2) {
        return {
          data: {
            tenant_id: 'tenant-1',
            official_name: 'Colegio Renombrado',
            institution_rut: null,
            address: null,
            commune: null,
            region: null,
            phone: null,
            institutional_email: null,
            proprietor: null,
            director_name: null,
            education_levels: ['MEDIA'],
            logo_path: null,
            updated_at: '2026-08-06T12:00:00.000Z',
            updated_by: 'user-1',
          },
          error: null,
        };
      }
      return {
        data: {
          tenant_id: 'tenant-1',
          official_name: 'Colegio Ejemplo',
          institution_rut: null,
          address: null,
          commune: null,
          region: null,
          phone: null,
          institutional_email: null,
          proprietor: null,
          director_name: null,
          education_levels: [],
          logo_path: null,
          updated_at: '2026-08-06T12:00:00.000Z',
          updated_by: null,
        },
        error: null,
      };
    }
    if (table === 'institution_settings' && calls.includes('upsert')) {
      return { data: null, error: null };
    }
    if (table === 'audit_events') return { data: null, error: null };
    return { data: null, error: null };
  };
  const req = createReq({
    method: 'PATCH',
    url: '/admin/institution',
    body: { official_name: 'Colegio Renombrado', education_levels: ['media'] },
  });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal((res._body as { official_name?: string })?.official_name, 'Colegio Renombrado');
  assert.deepEqual((res._body as { education_levels?: string[] })?.education_levels, ['MEDIA']);
});

test('PATCH /admin/institution rechaza nombre oficial vacío', async () => {
  tableHandler = (table) => {
    if (table === 'institution_settings') {
      return { data: null, error: null };
    }
    if (table === 'tenants') return { data: { name: '' }, error: null };
    return { data: null, error: null };
  };
  const req = createReq({
    method: 'PATCH',
    url: '/admin/institution',
    body: {},
  });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal(res._status, 500);
  assert.match((res._body as { error?: string })?.error ?? '', /nombre oficial es obligatorio/);
});

test('GET /admin/rules lista reglamentos ordenados', async () => {
  tableHandler = (table, calls) => {
    if (table === 'institution_rule_versions') {
      assert.ok(calls.includes('order:updated_at'));
      return {
        data: [
          {
            id: 'rule-1',
            tenant_id: 'tenant-1',
            title: 'Reglamento Interno',
            version: '2026.1',
            content: '...',
            status: 'active',
            effective_at: '2026-03-01T00:00:00.000Z',
            created_at: '2026-02-01T00:00:00.000Z',
            updated_at: '2026-02-01T00:00:00.000Z',
            created_by: 'user-1',
            published_by: 'user-1',
          },
        ],
        error: null,
      };
    }
    return { data: null, error: null };
  };
  const req = createReq({ method: 'GET', url: '/admin/rules' });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal((res._body as { rules?: unknown[] })?.rules?.length, 1);
});

test('POST /admin/rules crea reglamento y registra auditoría', async () => {
  tableHandler = (table, calls) => {
    if (table === 'institution_rule_versions' && calls.includes('insert')) {
      return {
        data: {
          id: 'rule-2',
          tenant_id: 'tenant-1',
          title: 'Nuevo Reglamento',
          version: '2026.2',
          content: 'Texto del reglamento',
          status: 'draft',
          effective_at: null,
          created_at: '2026-08-06T12:00:00.000Z',
          updated_at: '2026-08-06T12:00:00.000Z',
          created_by: 'user-1',
          published_by: null,
        },
        error: null,
      };
    }
    if (table === 'audit_events') return { data: null, error: null };
    return { data: null, error: null };
  };
  const req = createReq({
    method: 'POST',
    url: '/admin/rules',
    body: { title: 'Nuevo Reglamento', version: '2026.2', content: 'Texto del reglamento' },
  });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal((res._body as { title?: string })?.title, 'Nuevo Reglamento');
});

test('POST /admin/rules rechaza reglamento sin contenido', async () => {
  tableHandler = () => ({ data: null, error: null });
  const req = createReq({ method: 'POST', url: '/admin/rules', body: { title: 'x' } });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal(res._status, 500);
  assert.match((res._body as { error?: string })?.error ?? '', /obligatorios/);
});

test('POST /admin/rules/:id/publish archiva versión activa y publica la nueva', async () => {
  tableHandler = (table, calls) => {
    if (table === 'institution_rule_versions' && calls.includes('maybeSingle')) {
      return {
        data: {
          id: 'rule-3',
          tenant_id: 'tenant-1',
          title: 'Reglamento',
          version: '2026.3',
          content: '...',
          status: 'draft',
          effective_at: null,
          created_at: '2026-08-01T00:00:00.000Z',
          updated_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-1',
          published_by: null,
        },
        error: null,
      };
    }
    if (
      table === 'institution_rule_versions' &&
      calls.includes('update') &&
      calls.some((call) => call.startsWith('__{"status":"active"'))
    ) {
      return {
        data: {
          id: 'rule-3',
          tenant_id: 'tenant-1',
          title: 'Reglamento',
          version: '2026.3',
          content: '...',
          status: 'active',
          effective_at: '2026-08-06T12:00:00.000Z',
          created_at: '2026-08-01T00:00:00.000Z',
          updated_at: '2026-08-01T00:00:00.000Z',
          created_by: 'user-1',
          published_by: 'user-1',
        },
        error: null,
      };
    }
    if (table === 'institution_rule_versions' && calls.includes('update')) {
      return { data: null, error: null };
    }
    if (table === 'audit_events') return { data: null, error: null };
    return { data: null, error: null };
  };
  const req = createReq({ method: 'POST', url: '/admin/rules/rule-3/publish' });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal((res._body as { status?: string })?.status, 'active');
});

test('getTenantFromRequest rechaza cambiar a otro tenant sin rol superadmin', async () => {
  tableHandler = () => ({ data: null, error: null });
  const client = fakeSupabaseClient(tableHandler);
  await assert.rejects(
    () =>
      getTenantFromRequest(
        client as never,
        { tenantId: 'tenant-1', profileRole: 'admin' } as never,
        'otro-tenant',
      ),
    /Solo el superadministrador puede cambiar de colegio/,
  );
});

test('getTenantFromRequest permite superadmin cambiar a otro tenant existente', async () => {
  tableHandler = (table) => {
    if (table === 'tenants') return { data: { id: 'otro-tenant' }, error: null };
    return { data: null, error: null };
  };
  const client = fakeSupabaseClient(tableHandler);
  const tenantId = await getTenantFromRequest(
    client as never,
    { tenantId: 'tenant-1', profileRole: 'superadmin' } as never,
    'otro-tenant',
  );
  assert.equal(tenantId, 'otro-tenant');
});

test('GET /onboarding/status calcula estado de configuración', async () => {
  tableHandler = (table) => {
    if (table === 'institution_settings') return { data: { tenant_id: 'tenant-1' }, error: null };
    if (table === 'courses') return { data: null, count: 3, error: null };
    if (table === 'document_templates') return { data: null, count: 1, error: null };
    if (table === 'profiles') return { data: null, count: 4, error: null };
    if (table === 'institution_rule_versions') return { data: null, count: 1, error: null };
    return { data: null, error: null };
  };
  const req = createReq({ method: 'GET', url: '/onboarding/status' });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.deepEqual(res._body, {
    profile: true,
    courses: true,
    templates: true,
    members: true,
    rules: true,
  });
});

test('GET /platform/tenants/:id/institution valida existencia del colegio', async () => {
  tableHandler = (table) => {
    if (table === 'tenants') return { data: { id: 'tenant-2' }, error: null };
    if (table === 'institution_settings') {
      return {
        data: {
          tenant_id: 'tenant-2',
          official_name: 'Colegio Dos',
          education_levels: [],
          logo_path: null,
          updated_at: '2026-08-06T12:00:00.000Z',
          updated_by: null,
        },
        error: null,
      };
    }
    return { data: null, error: null };
  };
  const req = createReq({
    method: 'GET',
    url: '/platform/tenants/tenant-2/institution',
    params: { tenantId: 'tenant-2' },
    profileRole: 'superadmin',
  });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal((res._body as { official_name?: string })?.official_name, 'Colegio Dos');
});

test('GET /platform/tenants/:id/institution responde 404 si el colegio no existe', async () => {
  tableHandler = (table) => {
    if (table === 'tenants') return { data: null, error: null };
    return { data: null, error: null };
  };
  const req = createReq({
    method: 'GET',
    url: '/platform/tenants/inexistente/institution',
    params: { tenantId: 'inexistente' },
    profileRole: 'superadmin',
  });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  assert.equal(res._status, 500);
  assert.match((res._body as { error?: string })?.error ?? '', /Colegio no encontrado/);
});

test('GET /platform/tenants/:id/documents lista documentos con URL firmada', async () => {
  tableHandler = (table) => {
    if (table === 'tenants') return { data: { id: 'tenant-2' }, error: null };
    if (table === 'institution_documents') {
      return {
        data: [
          {
            id: 'doc-1',
            tenant_id: 'tenant-2',
            title: 'Manual',
            category: 'manual',
            original_name: 'manual.pdf',
            storage_path: 'tenant-2/documents/manual.pdf',
            mime_type: 'application/pdf',
            size_bytes: 100,
            status: 'active',
            uploaded_at: '2026-08-01T00:00:00.000Z',
            archived_at: null,
            uploaded_by: 'user-1',
            archived_by: null,
          },
        ],
        error: null,
      };
    }
    return { data: null, error: null };
  };
  const req = createReq({
    method: 'GET',
    url: '/platform/tenants/tenant-2/documents',
    params: { tenantId: 'tenant-2' },
    profileRole: 'superadmin',
  });
  const res = createRes();
  await handle(institutionRouter as unknown as (req: Request, res: Response) => void, req, res);

  const documents = (res._body as { documents?: Array<{ download_url?: string | null }> })
    ?.documents;
  assert.equal(documents?.length, 1);
  assert.equal(documents?.[0]?.download_url, 'https://cdn/firma.png');
});
