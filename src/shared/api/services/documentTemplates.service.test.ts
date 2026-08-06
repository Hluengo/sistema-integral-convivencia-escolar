/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DocumentTemplate } from './documentTemplates.service';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

async function withTemplateMocks(options: {
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

function makeTemplate(overrides: Partial<DocumentTemplate> = {}): DocumentTemplate {
  return {
    id: 'tpl-1',
    doc_type: 'notificacion_inicio_indagacion',
    label: 'Notificación de inicio de indagación',
    system_prompt: 'Eres un asistente legal...',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('fetchAdminDocumentTemplates', () => {
  it('llama al endpoint con token y devuelve las plantillas', async () => {
    let capturedUrl = '';
    let capturedAuth: string | undefined;
    const result = await withTemplateMocks({
      sessionToken: 'token-1',
      fetch: async (url, init) => {
        capturedUrl = url;
        const headers = init?.headers as Record<string, string> | undefined;
        capturedAuth = headers?.Authorization;
        return jsonResponse([makeTemplate(), makeTemplate({ id: 'tpl-2' })]);
      },
      fn: async () => {
        const { fetchAdminDocumentTemplates } = await import('./documentTemplates.service');
        return fetchAdminDocumentTemplates();
      },
    });
    assert.equal(capturedUrl, '/api/document-templates/admin');
    assert.equal(capturedAuth, 'Bearer token-1');
    assert.equal((result as DocumentTemplate[]).length, 2);
  });

  it('lanza sesión no válida con status 401', async () => {
    await assert.rejects(
      withTemplateMocks({
        sessionToken: null,
        fetch: async () => jsonResponse({}, 401),
        fn: async () => {
          const { fetchAdminDocumentTemplates } = await import('./documentTemplates.service');
          return fetchAdminDocumentTemplates();
        },
      }),
      /Inicie sesión nuevamente/,
    );
  });

  it('lanza error de permisos con status 403', async () => {
    await assert.rejects(
      withTemplateMocks({
        sessionToken: 'token-1',
        fetch: async () => jsonResponse({}, 403),
        fn: async () => {
          const { fetchAdminDocumentTemplates } = await import('./documentTemplates.service');
          return fetchAdminDocumentTemplates();
        },
      }),
      /solo para Dirección y Administración/,
    );
  });

  it('lanza error genérico cuando la respuesta no es ok', async () => {
    await assert.rejects(
      withTemplateMocks({
        sessionToken: 'token-1',
        fetch: async () => jsonResponse({}, 500),
        fn: async () => {
          const { fetchAdminDocumentTemplates } = await import('./documentTemplates.service');
          return fetchAdminDocumentTemplates();
        },
      }),
      /No fue posible cargar las plantillas institucionales/,
    );
  });

  it('lanza formato inválido cuando el payload no es un arreglo de plantillas', async () => {
    await assert.rejects(
      withTemplateMocks({
        sessionToken: 'token-1',
        fetch: async () => jsonResponse([{ id: 'x' }]),
        fn: async () => {
          const { fetchAdminDocumentTemplates } = await import('./documentTemplates.service');
          return fetchAdminDocumentTemplates();
        },
      }),
      /formato válido/,
    );
  });
});

describe('updateDocumentTemplate', () => {
  it('envía PUT con system_prompt y resuelve cuando success es true', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';
    await withTemplateMocks({
      sessionToken: 'token-2',
      fetch: async (url, init) => {
        capturedUrl = url;
        capturedMethod = init?.method ?? '';
        capturedBody = String(init?.body);
        return jsonResponse({ success: true });
      },
      fn: async () => {
        const { updateDocumentTemplate } = await import('./documentTemplates.service');
        return updateDocumentTemplate({ id: 'tpl-1', systemPrompt: 'nuevo prompt' });
      },
    });
    assert.equal(capturedUrl, '/api/document-templates');
    assert.equal(capturedMethod, 'PUT');
    const parsed = JSON.parse(capturedBody) as { id: string; system_prompt: string };
    assert.equal(parsed.system_prompt, 'nuevo prompt');
  });

  it('lanza el error del payload cuando la respuesta no es ok', async () => {
    await assert.rejects(
      withTemplateMocks({
        sessionToken: 'token-2',
        fetch: async () => jsonResponse({ error: 'Error al guardar.' }, 400),
        fn: async () => {
          const { updateDocumentTemplate } = await import('./documentTemplates.service');
          return updateDocumentTemplate({ id: 'tpl-1', systemPrompt: 'x' });
        },
      }),
      /Error al guardar/,
    );
  });

  it('lanza error genérico cuando success no es true', async () => {
    await assert.rejects(
      withTemplateMocks({
        sessionToken: 'token-2',
        fetch: async () => jsonResponse({ success: false }, 200),
        fn: async () => {
          const { updateDocumentTemplate } = await import('./documentTemplates.service');
          return updateDocumentTemplate({ id: 'tpl-1', systemPrompt: 'x' });
        },
      }),
      /Error al guardar/,
    );
  });
});
