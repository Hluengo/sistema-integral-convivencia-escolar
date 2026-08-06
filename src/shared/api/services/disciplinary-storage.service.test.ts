/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { UploadedDisciplinaryFile } from './disciplinary-storage.service';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

const MAX_DISCIPLINARY_PDF_BYTES = 10 * 1024 * 1024;

function makeFile(overrides: Partial<Pick<File, 'name' | 'size' | 'type'>> = {}): File {
  const name = overrides.name ?? 'informe.pdf';
  const size = overrides.size ?? 1024;
  const type = overrides.type ?? 'application/pdf';
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

interface StorageLike {
  upload: (
    path: string,
    _file: unknown,
    _options?: Record<string, unknown>,
  ) => Promise<{ error: Error | null }>;
  remove: (_paths: string[]) => Promise<{ error: Error | null }>;
}

interface MutableSupabase {
  storage: {
    from: (bucket: string) => StorageLike;
  };
}

async function withStorageMocks(options: {
  storageHandler: () => StorageLike;
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.storage.from;
  const originalConsoleError = console.error;
  mutable.storage.from = (_bucket) => options.storageHandler();
  console.error = () => undefined;
  try {
    return await options.fn();
  } finally {
    mutable.storage.from = originalFrom;
    console.error = originalConsoleError;
  }
}

describe('validateDisciplinaryPdf', () => {
  it('acepta un PDF válido', async () => {
    const { validateDisciplinaryPdf } = await import('./disciplinary-storage.service');
    assert.equal(validateDisciplinaryPdf(makeFile()), null);
  });

  it('rechaza archivos que no son PDF', async () => {
    const { validateDisciplinaryPdf } = await import('./disciplinary-storage.service');
    assert.match(
      String(validateDisciplinaryPdf(makeFile({ type: 'image/png', name: 'foto.png' }))),
      /Solo se permiten archivos PDF/,
    );
  });

  it('rechaza extensiones no .pdf', async () => {
    const { validateDisciplinaryPdf } = await import('./disciplinary-storage.service');
    assert.match(
      String(validateDisciplinaryPdf(makeFile({ type: '', name: 'informe.txt' }))),
      /extensión \.pdf/,
    );
  });

  it('rechaza archivos sobre 10 MB', async () => {
    const { validateDisciplinaryPdf } = await import('./disciplinary-storage.service');
    const err = validateDisciplinaryPdf(makeFile({ size: MAX_DISCIPLINARY_PDF_BYTES + 1 }));
    assert.match(String(err), /tamaño máximo/);
  });

  it('rechaza archivos vacíos', async () => {
    const { validateDisciplinaryPdf } = await import('./disciplinary-storage.service');
    assert.match(String(validateDisciplinaryPdf(makeFile({ size: 0 }))), /está vacío/);
  });
});

describe('uploadDisciplinaryFile', () => {
  it('sube el PDF y devuelve metadatos con ruta por tenant/estudiante/proceso', async () => {
    let uploadedPath = '';
    const result = (await withStorageMocks({
      storageHandler: () => ({
        upload: async (path, _file, _options) => {
          uploadedPath = path;
          return { error: null };
        },
        remove: async () => ({ error: null }),
      }),
      fn: async () => {
        const { uploadDisciplinaryFile } = await import('./disciplinary-storage.service');
        return uploadDisciplinaryFile(makeFile(), 'tenant-1', 'student-1', 'process-1');
      },
    })) as UploadedDisciplinaryFile | null;
    assert.ok(result);
    assert.equal(result.bucket, 'disciplinary-processes');
    assert.ok(uploadedPath.startsWith('tenant-1/student-1/process-1/'));
    assert.ok(uploadedPath.endsWith('.pdf'));
    assert.equal(result.size, 1024);
  });

  it('usa segmentos por defecto cuando no hay estudiante ni proceso', async () => {
    let uploadedPath = '';
    await withStorageMocks({
      storageHandler: () => ({
        upload: async (path) => {
          uploadedPath = path;
          return { error: null };
        },
        remove: async () => ({ error: null }),
      }),
      fn: async () => {
        const { uploadDisciplinaryFile } = await import('./disciplinary-storage.service');
        return uploadDisciplinaryFile(makeFile(), 'tenant-1');
      },
    });
    assert.ok(uploadedPath.startsWith('tenant-1/pending-student/draft/'));
  });

  it('lanza error de validación antes de subir', async () => {
    await assert.rejects(
      withStorageMocks({
        storageHandler: () => ({
          upload: async () => ({ error: null }),
          remove: async () => ({ error: null }),
        }),
        fn: async () => {
          const { uploadDisciplinaryFile } = await import('./disciplinary-storage.service');
          return uploadDisciplinaryFile(makeFile({ name: 'nota.txt', type: '' }), 'tenant-1');
        },
      }),
      /extensión \.pdf/,
    );
  });

  it('lanza error genérico cuando falla el upload', async () => {
    await assert.rejects(
      withStorageMocks({
        storageHandler: () => ({
          upload: async () => ({ error: new Error('storage denied') }),
          remove: async () => ({ error: null }),
        }),
        fn: async () => {
          const { uploadDisciplinaryFile } = await import('./disciplinary-storage.service');
          return uploadDisciplinaryFile(makeFile(), 'tenant-1');
        },
      }),
      /No fue posible subir el PDF/,
    );
  });
});

describe('deleteDisciplinaryFile', () => {
  it('elimina el archivo y no lanza error', async () => {
    let removed: string[] = [];
    await withStorageMocks({
      storageHandler: () => ({
        upload: async () => ({ error: null }),
        remove: async (paths) => {
          removed = paths;
          return { error: null };
        },
      }),
      fn: async () => {
        const { deleteDisciplinaryFile } = await import('./disciplinary-storage.service');
        await deleteDisciplinaryFile('tenant-1/a.pdf');
      },
    });
    assert.deepEqual(removed, ['tenant-1/a.pdf']);
  });

  it('no lanza error cuando el remove falla', async () => {
    await withStorageMocks({
      storageHandler: () => ({
        upload: async () => ({ error: null }),
        remove: async () => ({ error: new Error('denied') }),
      }),
      fn: async () => {
        const { deleteDisciplinaryFile } = await import('./disciplinary-storage.service');
        await deleteDisciplinaryFile('tenant-1/a.pdf');
      },
    });
  });
});
