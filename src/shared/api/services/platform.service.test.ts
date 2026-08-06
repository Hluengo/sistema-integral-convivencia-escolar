/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  PlatformTenantSummary,
  PlatformTenantSummaryDetails,
  ProvisionTenantResult,
  ImportSummary,
} from './platform.service';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

async function withPlatformMocks(options: {
  sessionToken?: string | null;
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutableAuth = supabase.auth as unknown as {
    getSession: () => Promise<{ data: { session: { access_token: string } | null } }>;
  };
  const originalGetSession = mutableAuth.getSession;
  const originalFetch = globalThis.fetch;
  mutableAuth.getSession = async () => ({
    data: { session: options.sessionToken ? { access_token: options.sessionToken } : null },
  });
  if (options.fetch) globalThis.fetch = options.fetch as typeof fetch;
  try {
    return await options.fn();
  } finally {
    mutableAuth.getSession = originalGetSession;
    if (options.fetch) globalThis.fetch = originalFetch;
  }
}

function jsonResponse(body: unknown, status = 200, jsonShouldThrow = false): Response {
  const response = new Response(null, { status });
  Object.defineProperty(response, 'json', {
    value: jsonShouldThrow
      ? async () => {
          throw new Error('invalid json');
        }
      : async () => body,
  });
  return response;
}

describe('fetchPlatformTenants', () => {
  it('llama a /api/platform/tenants y devuelve el resumen', async () => {
    let capturedUrl = '';
    const body: PlatformTenantSummary = {
      tenants: [
        {
          id: 't1',
          name: 'Colegio Uno',
          slug: 'colegio-uno',
          created_at: '2026-01-01',
          user_count: 3,
        },
      ],
    };
    const result = await withPlatformMocks({
      sessionToken: 'token-1',
      fetch: async (url) => {
        capturedUrl = url;
        return jsonResponse(body);
      },
      fn: async () => {
        const { fetchPlatformTenants } = await import('./platform.service');
        return fetchPlatformTenants();
      },
    });
    assert.equal(capturedUrl, '/api/platform/tenants');
    assert.equal((result as PlatformTenantSummary).tenants.length, 1);
  });

  it('lanza error con mensaje del payload cuando la respuesta no es ok', async () => {
    await assert.rejects(
      withPlatformMocks({
        sessionToken: 'token-1',
        fetch: async () => jsonResponse({ error: 'Sin permisos de plataforma.' }, 403),
        fn: async () => {
          const { fetchPlatformTenants } = await import('./platform.service');
          return fetchPlatformTenants();
        },
      }),
      /Sin permisos de plataforma/,
    );
  });

  it('lanza error genérico cuando el payload no tiene error', async () => {
    await assert.rejects(
      withPlatformMocks({
        sessionToken: 'token-1',
        fetch: async () => jsonResponse({}, 500),
        fn: async () => {
          const { fetchPlatformTenants } = await import('./platform.service');
          return fetchPlatformTenants();
        },
      }),
      /No fue posible completar la operación de plataforma/,
    );
  });
});

describe('provisionTenant', () => {
  it('envía POST con el body JSON y devuelve el resultado', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';
    const resultBody: ProvisionTenantResult = {
      tenant: { id: 't2', name: 'Nuevo', slug: 'nuevo' },
      invitation: { email: 'admin@nuevo.cl', status: 'pending' },
    };
    const result = await withPlatformMocks({
      sessionToken: 'token-1',
      fetch: async (url, init) => {
        capturedUrl = url;
        capturedMethod = init?.method ?? '';
        capturedBody = String(init?.body);
        return jsonResponse(resultBody);
      },
      fn: async () => {
        const { provisionTenant } = await import('./platform.service');
        return provisionTenant({ name: 'Nuevo', adminEmail: 'admin@nuevo.cl' });
      },
    });
    assert.equal(capturedUrl, '/api/platform/tenants');
    assert.equal(capturedMethod, 'POST');
    const parsed = JSON.parse(capturedBody) as { name: string; adminEmail: string };
    assert.equal(parsed.adminEmail, 'admin@nuevo.cl');
    assert.equal((result as ProvisionTenantResult).tenant.name, 'Nuevo');
  });
});

describe('fetchPlatformTenantSummary', () => {
  it('llama al endpoint de resumen con tenant codificado', async () => {
    let capturedUrl = '';
    const body: PlatformTenantSummaryDetails = {
      tenant_id: 't1',
      users: 5,
      courses: 20,
      students: 400,
      cases: 12,
      templates: 6,
      institution_documents: 3,
    };
    const result = await withPlatformMocks({
      sessionToken: 'token-1',
      fetch: async (url) => {
        capturedUrl = url;
        return jsonResponse(body);
      },
      fn: async () => {
        const { fetchPlatformTenantSummary } = await import('./platform.service');
        return fetchPlatformTenantSummary('t1');
      },
    });
    assert.equal(capturedUrl, '/api/platform/tenants/t1/summary');
    assert.equal((result as PlatformTenantSummaryDetails).students, 400);
  });
});

describe('resendTenantAdminInvitation', () => {
  it('envía POST al endpoint de invitación', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    await withPlatformMocks({
      sessionToken: 'token-1',
      fetch: async (url, init) => {
        capturedUrl = url;
        capturedMethod = init?.method ?? '';
        return jsonResponse({ success: true });
      },
      fn: async () => {
        const { resendTenantAdminInvitation } = await import('./platform.service');
        await resendTenantAdminInvitation('t1');
      },
    });
    assert.equal(capturedUrl, '/api/platform/tenants/t1/invite');
    assert.equal(capturedMethod, 'POST');
  });
});

describe('importTenantBase', () => {
  it('envía FormData con el archivo y devuelve el resumen de importación', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    const body: ImportSummary = {
      coursesInserted: 8,
      studentsInserted: 150,
      duplicates: 2,
      errors: [],
    };
    const result = await withPlatformMocks({
      sessionToken: 'token-1',
      fetch: async (url, init) => {
        capturedUrl = url;
        capturedMethod = init?.method ?? '';
        return jsonResponse(body);
      },
      fn: async () => {
        const { importTenantBase } = await import('./platform.service');
        const file = new File(['x'], 'alumnos.xlsx');
        return importTenantBase('t1', file, 'BASICA');
      },
    });
    assert.equal(capturedUrl, '/api/platform/tenants/t1/import');
    assert.equal(capturedMethod, 'POST');
    assert.equal((result as ImportSummary).studentsInserted, 150);
  });

  it('lanza error del payload cuando falla', async () => {
    await assert.rejects(
      withPlatformMocks({
        sessionToken: 'token-1',
        fetch: async () => jsonResponse({ error: 'Archivo inválido.' }, 400),
        fn: async () => {
          const { importTenantBase } = await import('./platform.service');
          const file = new File(['x'], 'alumnos.xlsx');
          return importTenantBase('t1', file, 'MEDIA');
        },
      }),
      /Archivo inválido/,
    );
  });
});
