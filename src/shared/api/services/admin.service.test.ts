/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

async function withAdminMocks(options: {
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
  const originalConsoleError = console.error;

  mutableAuth.getSession = async () => ({
    data: { session: options.sessionToken ? { access_token: options.sessionToken } : null },
  });
  console.error = () => undefined;

  if (options.fetch) {
    globalThis.fetch = options.fetch as typeof fetch;
  }

  try {
    return await options.fn();
  } finally {
    mutableAuth.getSession = originalGetSession;
    if (options.fetch) globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
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

describe('fetchAdminMembers', () => {
  it('llama a /api/admin/members con token y devuelve los miembros', async () => {
    let capturedUrl = '';
    let capturedHeaders: HeadersInit | undefined;
    const result = await withAdminMocks({
      sessionToken: 'token-1',
      fetch: async (url, init) => {
        capturedUrl = url;
        capturedHeaders = init?.headers;
        return jsonResponse({ members: [], invitations: [], history: [] });
      },
      fn: async () => {
        const { fetchAdminMembers } = await import('./admin.service');
        return fetchAdminMembers();
      },
    });
    assert.equal(capturedUrl, '/api/admin/members');
    const headers = capturedHeaders as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer token-1');
    assert.deepEqual(result, { members: [], invitations: [], history: [] });
  });

  it('lanza error con mensaje del servidor cuando la respuesta no es ok', async () => {
    await assert.rejects(
      withAdminMocks({
        sessionToken: null,
        fetch: async () => jsonResponse({ error: 'No autorizado' }, 403),
        fn: async () => {
          const { fetchAdminMembers } = await import('./admin.service');
          return fetchAdminMembers();
        },
      }),
      /No autorizado/,
    );
  });

  it('usa mensaje genérico cuando el payload no trae error', async () => {
    await assert.rejects(
      withAdminMocks({
        sessionToken: null,
        fetch: async () => jsonResponse({ detail: 'nope' }, 500),
        fn: async () => {
          const { fetchAdminMembers } = await import('./admin.service');
          return fetchAdminMembers();
        },
      }),
      /No fue posible completar la operación administrativa/,
    );
  });
});

describe('updateAdminMember', () => {
  it('envía PATCH con rol y estado de acceso', async () => {
    let captured: { method?: string; body?: string } = {};
    await withAdminMocks({
      sessionToken: 'token-1',
      fetch: async (_url, init) => {
        captured = { method: init?.method, body: init?.body as string };
        return jsonResponse(null);
      },
      fn: async () => {
        const { updateAdminMember } = await import('./admin.service');
        await updateAdminMember('user-1', { role: 'convivencia', accessEnabled: true });
        return null;
      },
    });
    assert.equal(captured.method, 'PATCH');
    assert.deepEqual(JSON.parse(captured.body as string), {
      role: 'convivencia',
      accessEnabled: true,
    });
  });
});

describe('inviteAdminMember', () => {
  it('envía POST con email y rol', async () => {
    let capturedBody = '';
    await withAdminMocks({
      sessionToken: 'token-1',
      fetch: async (_url, init) => {
        capturedBody = init?.body as string;
        return jsonResponse(null);
      },
      fn: async () => {
        const { inviteAdminMember } = await import('./admin.service');
        await inviteAdminMember('invitado@colegio.cl', 'teacher');
        return null;
      },
    });
    assert.deepEqual(JSON.parse(capturedBody), { email: 'invitado@colegio.cl', role: 'teacher' });
  });
});

describe('resendAdminInvitation y cancelAdminInvitation', () => {
  it('reenvía la invitación al endpoint correspondiente', async () => {
    let capturedUrl = '';
    await withAdminMocks({
      sessionToken: 'token-1',
      fetch: async (url) => {
        capturedUrl = url;
        return jsonResponse(null);
      },
      fn: async () => {
        const { resendAdminInvitation } = await import('./admin.service');
        await resendAdminInvitation('inv-1');
        return null;
      },
    });
    assert.equal(capturedUrl, '/api/admin/invitations/inv-1/resend');
  });

  it('cancela la invitación al endpoint correspondiente', async () => {
    let capturedUrl = '';
    await withAdminMocks({
      sessionToken: 'token-1',
      fetch: async (url) => {
        capturedUrl = url;
        return jsonResponse(null);
      },
      fn: async () => {
        const { cancelAdminInvitation } = await import('./admin.service');
        await cancelAdminInvitation('inv-1');
        return null;
      },
    });
    assert.equal(capturedUrl, '/api/admin/invitations/inv-1/cancel');
  });
});

describe('fetchUsageStats', () => {
  it('normaliza eventos y usuarios activos', async () => {
    const result = await withAdminMocks({
      sessionToken: null,
      fetch: async () =>
        jsonResponse({
          events: [{ event_name: 'login', total_count: 10 }],
          dailyActiveUsers: [{ day: '2026-08-01', active_users: 3 }],
        }),
      fn: async () => {
        const { fetchUsageStats } = await import('./admin.service');
        return fetchUsageStats();
      },
    });
    const stats = result as { events: Array<{ event_name: string }>; dailyActiveUsers: unknown[] };
    assert.equal(stats.events[0].event_name, 'login');
    assert.equal(stats.dailyActiveUsers.length, 1);
  });

  it('retorna listas vacías cuando el payload no es válido', async () => {
    const result = await withAdminMocks({
      sessionToken: null,
      fetch: async () => jsonResponse({ events: 'nope', dailyActiveUsers: null }),
      fn: async () => {
        const { fetchUsageStats } = await import('./admin.service');
        return fetchUsageStats();
      },
    });
    const stats = result as { events: unknown[]; dailyActiveUsers: unknown[] };
    assert.deepEqual(stats.events, []);
    assert.deepEqual(stats.dailyActiveUsers, []);
  });

  it('lanza error cuando la respuesta no es ok', async () => {
    await assert.rejects(
      withAdminMocks({
        sessionToken: null,
        fetch: async () => jsonResponse(null, 500),
        fn: async () => {
          const { fetchUsageStats } = await import('./admin.service');
          return fetchUsageStats();
        },
      }),
      /No fue posible cargar las métricas/,
    );
  });
});

describe('importOwnTenantBase', () => {
  it('envía FormData y devuelve el resumen de importación', async () => {
    let capturedBody: FormData | undefined;
    const result = await withAdminMocks({
      sessionToken: 'token-1',
      fetch: async (_url, init) => {
        capturedBody = init?.body as FormData;
        return jsonResponse({ coursesInserted: 2, studentsInserted: 5, duplicates: 1, errors: [] });
      },
      fn: async () => {
        const { importOwnTenantBase } = await import('./admin.service');
        const file = new File(['a,b,c'], 'base.csv', { type: 'text/csv' });
        return importOwnTenantBase(file, 'MEDIA');
      },
    });
    assert.ok(capturedBody instanceof FormData);
    assert.equal(capturedBody?.get('defaultLevel'), 'MEDIA');
    assert.deepEqual(result, {
      coursesInserted: 2,
      studentsInserted: 5,
      duplicates: 1,
      errors: [],
    });
  });

  it('lanza error del servidor cuando falla', async () => {
    await assert.rejects(
      withAdminMocks({
        sessionToken: 'token-1',
        fetch: async () => jsonResponse({ error: 'Archivo inválido' }, 400),
        fn: async () => {
          const { importOwnTenantBase } = await import('./admin.service');
          const file = new File(['x'], 'base.csv', { type: 'text/csv' });
          return importOwnTenantBase(file);
        },
      }),
      /Archivo inválido/,
    );
  });
});
