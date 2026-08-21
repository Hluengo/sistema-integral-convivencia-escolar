/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

interface StorageBucketLike {
  upload: (
    path: string,
    _file: unknown,
    _options?: Record<string, unknown>,
  ) => Promise<{ error: Error | null }>;
  createSignedUrl: (
    path: string,
    _ttl: number,
  ) => Promise<{ data: { signedUrl: string } | null; error: Error | null }>;
  list: (
    folder: string,
  ) => Promise<{ data: { name: string; id: string }[] | null; error: Error | null }>;
  remove: (_paths: string[]) => Promise<{ error: Error | null }>;
}

interface MutableSupabase {
  storage: {
    from: (bucket: string) => StorageBucketLike;
  };
}

function makeStorage(overrides: Partial<StorageBucketLike> = {}): StorageBucketLike {
  return {
    upload: async () => ({ error: null }),
    createSignedUrl: async () => ({
      data: { signedUrl: 'https://signed.example/url' },
      error: null,
    }),
    list: async () => ({ data: [{ name: 'a.pdf', id: 'a.pdf' }], error: null }),
    remove: async () => ({ error: null }),
    ...overrides,
  };
}

async function withStorageMocks(options: {
  bucketHandler: () => StorageBucketLike;
  windowOpenResult?: object | null;
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.storage.from;
  const originalConsoleError = console.error;
  mutable.storage.from = () => options.bucketHandler();
  console.error = () => undefined;

  const originalWindow = (globalThis as Record<string, unknown>).window;
  const fakeWindow = {
    open: () => options.windowOpenResult ?? { location: { href: '' }, close: () => undefined },
    location: { assign: () => undefined },
  };
  (globalThis as Record<string, unknown>).window = fakeWindow;

  try {
    return await options.fn();
  } finally {
    mutable.storage.from = originalFrom;
    console.error = originalConsoleError;
    if (originalWindow === undefined) delete (globalThis as Record<string, unknown>).window;
    else (globalThis as Record<string, unknown>).window = originalWindow;
  }
}

function makeDocumentFile(overrides: Partial<Pick<File, 'name' | 'size' | 'type'>> = {}): File {
  const name = overrides.name ?? 'informe.pdf';
  const size = overrides.size ?? 2048;
  const type = overrides.type ?? 'application/pdf';
  return new File([new Uint8Array(size)], name, { type });
}

describe('normalizeDocumentPath', () => {
  it('retorna la ruta limpia para paths simples', async () => {
    const { normalizeDocumentPath } = await import('./storage.service');
    assert.equal(normalizeDocumentPath('causa-1/documentos/a.pdf'), 'causa-1/documentos/a.pdf');
  });

  it('limpia slashes iniciales', async () => {
    const { normalizeDocumentPath } = await import('./storage.service');
    assert.equal(normalizeDocumentPath('/causa-1/a.pdf'), 'causa-1/a.pdf');
  });

  it('retorna null para strings vacíos', async () => {
    const { normalizeDocumentPath } = await import('./storage.service');
    assert.equal(normalizeDocumentPath('   '), null);
  });

  it('extrae la ruta de una URL firmada de storage', async () => {
    const { normalizeDocumentPath } = await import('./storage.service');
    const url =
      'https://abc.supabase.co/storage/v1/object/sign/documentos_convivencia/causa-1/a.pdf?token=x';
    assert.equal(normalizeDocumentPath(url), 'causa-1/a.pdf');
  });

  it('extrae la ruta decodificada de una URL pública', async () => {
    const { normalizeDocumentPath } = await import('./storage.service');
    const url =
      'https://abc.supabase.co/storage/v1/object/public/documentos_convivencia/causa%201/a.pdf';
    assert.equal(normalizeDocumentPath(url), 'causa 1/a.pdf');
  });

  it('retorna null para URLs externas sin el bucket', async () => {
    const { normalizeDocumentPath } = await import('./storage.service');
    assert.equal(normalizeDocumentPath('https://ejemplo.com/otro/a.pdf'), null);
  });

  it('retorna null para URLs inválidas', async () => {
    const { normalizeDocumentPath } = await import('./storage.service');
    assert.equal(normalizeDocumentPath('https://'), null);
  });
});

describe('uploadDocument', () => {
  it('expone un contrato único de formatos para formularios de respaldo', async () => {
    const { DOCUMENT_UPLOAD_ACCEPT, DOCUMENT_UPLOAD_HELPER_TEXT } =
      await import('./storage.service');

    assert.match(DOCUMENT_UPLOAD_ACCEPT, /\.pdf/);
    assert.match(DOCUMENT_UPLOAD_ACCEPT, /\.md/);
    assert.match(DOCUMENT_UPLOAD_ACCEPT, /text\/markdown/);
    assert.match(DOCUMENT_UPLOAD_ACCEPT, /\.docx/);
    assert.match(DOCUMENT_UPLOAD_ACCEPT, /\.jpeg/);
    assert.match(DOCUMENT_UPLOAD_ACCEPT, /\.webp/);
    assert.match(DOCUMENT_UPLOAD_HELPER_TEXT, /PDF, Markdown, Word o imagen/);
  });

  it('acepta Markdown como respaldo de hitos o bitácora', async () => {
    const result = await withStorageMocks({
      bucketHandler: makeStorage,
      fn: async () => {
        const { uploadDocument } = await import('./storage.service');
        return uploadDocument(
          'causa-1',
          makeDocumentFile({ name: 'respaldo.md', type: 'text/markdown' }),
          'documentos',
        );
      },
    });

    assert.match(result as string, /respaldo\.md$/);
  });

  it('sube el archivo y devuelve la ruta del bucket', async () => {
    let uploadedPath = '';
    const result = await withStorageMocks({
      bucketHandler: () =>
        makeStorage({
          upload: async (path) => {
            uploadedPath = path;
            return { error: null };
          },
        }),
      fn: async () => {
        const { uploadDocument } = await import('./storage.service');
        return uploadDocument('causa-1', makeDocumentFile(), 'documentos');
      },
    });
    assert.ok((result as string).startsWith('causa-1/documentos/'));
    assert.equal(uploadedPath, result);
  });

  it('acepta imágenes webp como respaldo de hitos o bitácora', async () => {
    const result = await withStorageMocks({
      bucketHandler: makeStorage,
      fn: async () => {
        const { uploadDocument } = await import('./storage.service');
        return uploadDocument(
          'causa-1',
          makeDocumentFile({ name: 'evidencia.webp', type: 'image/webp' }),
          'documentos',
        );
      },
    });

    assert.match(result as string, /evidencia\.webp$/);
  });

  it('lanza error para formato no permitido', async () => {
    await assert.rejects(
      withStorageMocks({
        bucketHandler: makeStorage,
        fn: async () => {
          const { uploadDocument } = await import('./storage.service');
          return uploadDocument('causa-1', makeDocumentFile({ name: 'foto.gif' }), 'documentos');
        },
      }),
      /Formato no permitido/,
    );
  });

  it('lanza error para archivo vacío', async () => {
    await assert.rejects(
      withStorageMocks({
        bucketHandler: makeStorage,
        fn: async () => {
          const { uploadDocument } = await import('./storage.service');
          return uploadDocument('causa-1', makeDocumentFile({ size: 0 }), 'documentos');
        },
      }),
      /documento está vacío/,
    );
  });

  it('lanza error cuando falla el upload', async () => {
    await assert.rejects(
      withStorageMocks({
        bucketHandler: () =>
          makeStorage({
            upload: async () => ({ error: new Error('storage denied') }),
          }),
        fn: async () => {
          const { uploadDocument } = await import('./storage.service');
          return uploadDocument('causa-1', makeDocumentFile(), 'documentos');
        },
      }),
      /No fue posible subir el documento/,
    );
  });
});

describe('openDocument', () => {
  it('abre el popup con la URL firmada y retorna true', async () => {
    const result = await withStorageMocks({
      bucketHandler: makeStorage,
      windowOpenResult: { location: { href: '' }, close: () => undefined },
      fn: async () => {
        const { openDocument } = await import('./storage.service');
        return openDocument('causa-1/documentos/a.pdf');
      },
    });
    assert.equal(result, true);
  });

  it('cierra el popup y retorna false cuando no hay URL firmada', async () => {
    const result = await withStorageMocks({
      bucketHandler: () =>
        makeStorage({
          createSignedUrl: async () => ({ data: null, error: new Error('Object not found') }),
        }),
      windowOpenResult: { location: { href: '' }, close: () => undefined },
      fn: async () => {
        const { openDocument } = await import('./storage.service');
        return openDocument('causa-1/documentos/a.pdf');
      },
    });
    assert.equal(result, false);
  });

  it('retorna false para rutas no normalizables', async () => {
    const result = await withStorageMocks({
      bucketHandler: makeStorage,
      fn: async () => {
        const { openDocument } = await import('./storage.service');
        return openDocument('https://externa.com/x.pdf');
      },
    });
    assert.equal(result, false);
  });
});

describe('listDocuments', () => {
  it('lista los documentos del folder y construye URLs relativas', async () => {
    const result = await withStorageMocks({
      bucketHandler: makeStorage,
      fn: async () => {
        const { listDocuments } = await import('./storage.service');
        return listDocuments('causa-1');
      },
    });
    const items = result as { name: string; url: string }[];
    assert.equal(items.length, 1);
    assert.equal(items[0].url, 'causa-1/documentos/a.pdf');
  });

  it('retorna lista vacía cuando falla la lista', async () => {
    const result = await withStorageMocks({
      bucketHandler: () =>
        makeStorage({
          list: async () => ({ data: null, error: new Error('boom') }),
        }),
      fn: async () => {
        const { listDocuments } = await import('./storage.service');
        return listDocuments('causa-1');
      },
    });
    assert.deepEqual(result, []);
  });
});

describe('deleteDocument', () => {
  it('elimina el documento y retorna true', async () => {
    let removed: string[] = [];
    const result = await withStorageMocks({
      bucketHandler: () =>
        makeStorage({
          remove: async (paths) => {
            removed = paths;
            return { error: null };
          },
        }),
      fn: async () => {
        const { deleteDocument } = await import('./storage.service');
        return deleteDocument('causa-1/documentos/a.pdf');
      },
    });
    assert.equal(result, true);
    assert.deepEqual(removed, ['causa-1/documentos/a.pdf']);
  });

  it('retorna false cuando falla el remove', async () => {
    const result = await withStorageMocks({
      bucketHandler: () =>
        makeStorage({
          remove: async () => ({ error: new Error('denied') }),
        }),
      fn: async () => {
        const { deleteDocument } = await import('./storage.service');
        return deleteDocument('causa-1/documentos/a.pdf');
      },
    });
    assert.equal(result, false);
  });
});
