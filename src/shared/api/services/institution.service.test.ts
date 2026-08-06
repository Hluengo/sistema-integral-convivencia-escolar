/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { InstitutionSettings } from './institution.service';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

async function withInstitutionMocks(options: {
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
  if (options.fetch) {
    globalThis.fetch = options.fetch as typeof fetch;
  }

  try {
    return await options.fn();
  } finally {
    mutableAuth.getSession = originalGetSession;
    if (options.fetch) globalThis.fetch = originalFetch;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  const response = new Response(null, { status });
  Object.defineProperty(response, 'json', {
    value: async () => body,
  });
  return response;
}

function makeSettings(overrides: Partial<InstitutionSettings> = {}): InstitutionSettings {
  return {
    tenant_id: 'tenant-1',
    official_name: 'Colegio Ejemplo',
    institution_rut: '11.111.111-1',
    address: 'Calle 1',
    commune: 'Santiago',
    region: 'Metropolitana',
    phone: '+569',
    institutional_email: 'contacto@colegio.cl',
    proprietor: 'Sostenedor',
    director_name: 'Director',
    education_levels: ['Básica'],
    logo_path: null,
    logo_url: null,
    updated_at: '2026-01-01T00:00:00.000Z',
    updated_by: null,
    ...overrides,
  };
}

describe('fetchOnboardingStatus', () => {
  it('obtiene el estado de onboarding', async () => {
    const result = await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async () =>
        jsonResponse({ profile: true, courses: true, templates: true, members: true, rules: true }),
      fn: async () => {
        const { fetchOnboardingStatus } = await import('./institution.service');
        return fetchOnboardingStatus();
      },
    });
    assert.deepEqual(result, {
      profile: true,
      courses: true,
      templates: true,
      members: true,
      rules: true,
    });
  });

  it('lanza error del servidor', async () => {
    await assert.rejects(
      withInstitutionMocks({
        sessionToken: null,
        fetch: async () => jsonResponse({ error: 'Sin permiso' }, 403),
        fn: async () => {
          const { fetchOnboardingStatus } = await import('./institution.service');
          return fetchOnboardingStatus();
        },
      }),
      /Sin permiso/,
    );
  });
});

describe('fetchInstitutionSettings', () => {
  it('obtiene la configuración institucional', async () => {
    const result = await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async () => jsonResponse(makeSettings()),
      fn: async () => {
        const { fetchInstitutionSettings } = await import('./institution.service');
        return fetchInstitutionSettings();
      },
    });
    assert.equal((result as InstitutionSettings).official_name, 'Colegio Ejemplo');
  });
});

describe('updateInstitutionSettings', () => {
  it('envía PATCH con los valores', async () => {
    let capturedBody = '';
    await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (_url, init) => {
        capturedBody = init?.body as string;
        return jsonResponse(makeSettings({ official_name: 'Colegio Renombrado' }));
      },
      fn: async () => {
        const { updateInstitutionSettings } = await import('./institution.service');
        await updateInstitutionSettings({ official_name: 'Colegio Renombrado' });
        return null;
      },
    });
    assert.deepEqual(JSON.parse(capturedBody), { official_name: 'Colegio Renombrado' });
  });
});

describe('uploadInstitutionLogo', () => {
  it('envía el archivo y devuelve la configuración', async () => {
    let capturedBody: FormData | undefined;
    const result = await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (_url, init) => {
        capturedBody = init?.body as FormData;
        return jsonResponse(makeSettings({ logo_path: 'logos/logo.png' }));
      },
      fn: async () => {
        const { uploadInstitutionLogo } = await import('./institution.service');
        const file = new File(['logo'], 'logo.png', { type: 'image/png' });
        return uploadInstitutionLogo(file);
      },
    });
    assert.ok(capturedBody instanceof FormData);
    assert.ok(capturedBody?.has('logo'));
    assert.equal((result as InstitutionSettings).logo_path, 'logos/logo.png');
  });

  it('lanza error cuando falla la subida', async () => {
    await assert.rejects(
      withInstitutionMocks({
        sessionToken: null,
        fetch: async () => jsonResponse({ error: 'Archivo demasiado grande' }, 400),
        fn: async () => {
          const { uploadInstitutionLogo } = await import('./institution.service');
          const file = new File(['logo'], 'logo.png', { type: 'image/png' });
          return uploadInstitutionLogo(file);
        },
      }),
      /Archivo demasiado grande/,
    );
  });
});

describe('fetchInstitutionRules / createInstitutionRule / publishInstitutionRule', () => {
  it('obtiene las reglas', async () => {
    const result = await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async () => jsonResponse({ rules: [] }),
      fn: async () => {
        const { fetchInstitutionRules } = await import('./institution.service');
        return fetchInstitutionRules();
      },
    });
    assert.deepEqual(result, { rules: [] });
  });

  it('crea una regla', async () => {
    let capturedBody = '';
    await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (_url, init) => {
        capturedBody = init?.body as string;
        return jsonResponse({ id: 'rule-1', title: 'Regla 1', version: '1', content: 'x' });
      },
      fn: async () => {
        const { createInstitutionRule } = await import('./institution.service');
        await createInstitutionRule({ title: 'Regla 1', version: '1', content: 'x' });
        return null;
      },
    });
    assert.deepEqual(JSON.parse(capturedBody), { title: 'Regla 1', version: '1', content: 'x' });
  });

  it('publica una regla por id', async () => {
    let capturedUrl = '';
    await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (url) => {
        capturedUrl = url;
        return jsonResponse({ id: 'rule-1' });
      },
      fn: async () => {
        const { publishInstitutionRule } = await import('./institution.service');
        await publishInstitutionRule('rule-1');
        return null;
      },
    });
    assert.equal(capturedUrl, '/api/admin/rules/rule-1/publish');
  });
});

describe('platform institution', () => {
  it('obtiene configuración de un tenant', async () => {
    const result = await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async () => jsonResponse(makeSettings()),
      fn: async () => {
        const { fetchPlatformInstitutionSettings } = await import('./institution.service');
        return fetchPlatformInstitutionSettings('tenant-1');
      },
    });
    assert.equal((result as InstitutionSettings).tenant_id, 'tenant-1');
  });

  it('actualiza configuración de un tenant', async () => {
    let capturedUrl = '';
    await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (url) => {
        capturedUrl = url;
        return jsonResponse(makeSettings());
      },
      fn: async () => {
        const { updatePlatformInstitutionSettings } = await import('./institution.service');
        await updatePlatformInstitutionSettings('tenant-1', { phone: '+562' });
        return null;
      },
    });
    assert.equal(capturedUrl, '/api/platform/tenants/tenant-1/institution');
  });

  it('sube logo de un tenant', async () => {
    let capturedBody: FormData | undefined;
    await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (_url, init) => {
        capturedBody = init?.body as FormData;
        return jsonResponse(makeSettings());
      },
      fn: async () => {
        const { uploadPlatformInstitutionLogo } = await import('./institution.service');
        const file = new File(['logo'], 'logo.png', { type: 'image/png' });
        await uploadPlatformInstitutionLogo('tenant-1', file);
        return null;
      },
    });
    assert.ok(capturedBody instanceof FormData);
  });

  it('obtiene reglas de un tenant', async () => {
    const result = await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async () => jsonResponse({ rules: [] }),
      fn: async () => {
        const { fetchPlatformInstitutionRules } = await import('./institution.service');
        return fetchPlatformInstitutionRules('tenant-1');
      },
    });
    assert.deepEqual(result, { rules: [] });
  });

  it('crea regla de un tenant', async () => {
    let capturedUrl = '';
    await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (url) => {
        capturedUrl = url;
        return jsonResponse({ id: 'r' });
      },
      fn: async () => {
        const { createPlatformInstitutionRule } = await import('./institution.service');
        await createPlatformInstitutionRule('tenant-1', { title: 'T', version: '1', content: 'C' });
        return null;
      },
    });
    assert.equal(capturedUrl, '/api/platform/tenants/tenant-1/rules');
  });

  it('publica regla de un tenant', async () => {
    let capturedUrl = '';
    await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (url) => {
        capturedUrl = url;
        return jsonResponse({ id: 'r' });
      },
      fn: async () => {
        const { publishPlatformInstitutionRule } = await import('./institution.service');
        await publishPlatformInstitutionRule('tenant-1', 'rule-1');
        return null;
      },
    });
    assert.equal(capturedUrl, '/api/platform/tenants/tenant-1/rules/rule-1/publish');
  });

  it('obtiene documentos de un tenant', async () => {
    const result = await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async () => jsonResponse({ documents: [] }),
      fn: async () => {
        const { fetchPlatformInstitutionDocuments } = await import('./institution.service');
        return fetchPlatformInstitutionDocuments('tenant-1');
      },
    });
    assert.deepEqual(result, { documents: [] });
  });

  it('sube documento de un tenant', async () => {
    let capturedBody: FormData | undefined;
    await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (_url, init) => {
        capturedBody = init?.body as FormData;
        return jsonResponse({ id: 'doc-1', title: 'Documento' });
      },
      fn: async () => {
        const { uploadPlatformInstitutionDocument } = await import('./institution.service');
        const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
        await uploadPlatformInstitutionDocument('tenant-1', file, 'Manual', 'Reglamento');
        return null;
      },
    });
    assert.ok(capturedBody instanceof FormData);
    assert.equal(capturedBody?.get('title'), 'Manual');
    assert.equal(capturedBody?.get('category'), 'Reglamento');
  });

  it('archiva documento de un tenant', async () => {
    let capturedUrl = '';
    await withInstitutionMocks({
      sessionToken: 'token-1',
      fetch: async (url) => {
        capturedUrl = url;
        return jsonResponse({ id: 'doc-1' });
      },
      fn: async () => {
        const { archivePlatformInstitutionDocument } = await import('./institution.service');
        await archivePlatformInstitutionDocument('tenant-1', 'doc-1');
        return null;
      },
    });
    assert.equal(capturedUrl, '/api/platform/tenants/tenant-1/documents/doc-1/archive');
  });
});
