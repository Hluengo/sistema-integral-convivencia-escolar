/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mock, test } from 'node:test';

// ---------------------------------------------------------------------------
// Fake Supabase que responde según la tabla consultada y el orden de la cadena.
// ---------------------------------------------------------------------------
type QueryResult = { data: unknown; error: { message: string } | null };

interface FakeQueryOptions {
  handler: (table: string, calls: string[]) => QueryResult | Promise<QueryResult>;
}

class FakeQueryBuilder {
  private calls: string[] = [];
  private result: QueryResult = { data: null, error: null };

  constructor(
    private table: string,
    private handler: FakeQueryOptions['handler'],
  ) {}

  private record(method: string, arg?: unknown): this {
    this.calls.push(arg === undefined ? method : `${method}:${String(arg)}`);
    return this;
  }

  select(..._args: unknown[]) {
    return this.record('select');
  }
  eq(field: string, _value: unknown) {
    return this.record('eq', field);
  }
  ilike(field: string, _value: unknown) {
    return this.record('ilike', field);
  }
  limit(..._args: unknown[]) {
    return this.record('limit');
  }
  order(..._args: unknown[]) {
    return this.record('order');
  }
  in(..._args: unknown[]) {
    return this.record('in');
  }
  or(..._args: unknown[]) {
    return this.record('or');
  }
  insert(value: unknown) {
    this.calls.push('insert');
    this.result = this.syncResolve(this.handler, value);
    return this;
  }
  update(value: unknown) {
    this.calls.push('update');
    this.result = this.syncResolve(this.handler, value);
    return this;
  }
  maybeSingle() {
    this.calls.push('maybeSingle');
    return this;
  }
  single() {
    this.calls.push('single');
    return this;
  }
  async then(onFulfilled?: (value: QueryResult) => unknown) {
    const resolved = await this.resolveResult();
    return onFulfilled ? onFulfilled(resolved) : resolved;
  }
  private async resolveResult(): Promise<QueryResult> {
    if (!this.calls.includes('insert') && !this.calls.includes('update')) {
      return this.handler(this.table, this.calls);
    }
    return this.result;
  }
  private syncResolve(handler: FakeQueryOptions['handler'], value: unknown): QueryResult {
    const result = handler(this.table, this.calls.concat('__' + JSON.stringify(value ?? {})));
    if (result && typeof (result as Promise<QueryResult>).then === 'function') {
      throw new Error('insert/update handler no puede ser asíncrono en este mock');
    }
    return result as QueryResult;
  }
}

function createFakeSupabase(handler: FakeQueryOptions['handler']): SupabaseClient {
  const client: Record<string, unknown> = {
    from: (table: string) => new FakeQueryBuilder(table, handler),
    rpc: async (fn: string, params: unknown) =>
      handler('rpc_' + fn, ['rpc', JSON.stringify(params ?? {})]),
    storage: {
      from: () => ({
        download: async (path: string) => handler('storage_download', ['download', path]),
      }),
    },
  };
  return client as unknown as SupabaseClient;
}

// Para tipar con SupabaseClient en TypeScript estricto.
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Mocks de módulos: Supabase (createClient) y pdfjs (extractPdfPages dinámico).
// ---------------------------------------------------------------------------
let queryHandler: FakeQueryOptions['handler'] = () => ({ data: null, error: null });

await mock.module('@supabase/supabase-js', {
  namedExports: {
    createClient: () => createFakeSupabase(queryHandler),
  },
});

await mock.module('pdfjs-dist/legacy/build/pdf.worker.mjs', {
  namedExports: { WorkerMessageHandler: {} },
});

let pdfTextItems: Array<{ str: string; hasEOL?: boolean }> = [{ str: 'texto' }];
await mock.module('pdfjs-dist/legacy/build/pdf.mjs', {
  namedExports: {
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items: pdfTextItems }),
        }),
      }),
    }),
  },
});

const { analyzeDisciplinaryPdf, confirmDisciplinaryProcess } =
  await import('./disciplinaryPdfAnalysis.js');

const TENANT_ID = 'tenant-1';
const STUDENT_ID = 'student-1';

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
const PDF_HASH = createHash('sha256').update(PDF_BYTES).digest('hex');

function storagePdf(): { data: Blob; error: null } {
  return {
    data: new Blob([PDF_BYTES]) as Blob,
    error: null,
  };
}

test('analyzeDisciplinaryPdf detecta estudiante exacto y guarda análisis', async () => {
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  pdfTextItems = [
    {
      str: 'JUAN PEREZ GONZALEZ\nFICHA PERSONAL DE CONVIVENCIA ESCOLAR\n10/04/2026 Tipo: Negativa Profesor: Ana Lopez Falta reiterada.',
    },
  ];

  queryHandler = (table, calls) => {
    if (table === 'storage_download') return storagePdf();
    if (table === 'courses') return { data: [{ id: 'course-1', name: '1° Medio A' }], error: null };
    if (table === 'students' && calls.includes('ilike:full_name')) {
      return {
        data: [
          { id: STUDENT_ID, full_name: 'Juan Perez', rut: '11111111-1', course_id: 'course-1' },
        ],
        error: null,
      };
    }
    if (table === 'students') return { data: [], error: null };
    if (table === 'disciplinary_process_files') return { data: null, error: null };
    if (table.startsWith('rpc_get_suggested_letter_type')) {
      return { data: 'amonestacion', error: null };
    }
    if (table === 'document_analyses') {
      return { data: { id: 'analysis-1', analyzed_at: '2026-04-10T12:00:00.000Z' }, error: null };
    }
    return { data: null, error: null };
  };

  const result = await analyzeDisciplinaryPdf({
    bucket: 'disciplinary-processes',
    storagePath: `${TENANT_ID}/expediente.pdf`,
    fileName: 'expediente.pdf',
    tenantId: TENANT_ID,
  });

  assert.equal(result.success, true);
  assert.equal(result.selected_student_id, STUDENT_ID);
  assert.equal(result.processing_status, 'completed');
  assert.equal(result.mode, 'preview');
  assert.equal(result.negative_count, 1);
  assert.equal(result.recommended_letter_type, 'amonestacion');
  assert.equal(result.analysis_id, 'analysis-1');
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('analyzeDisciplinaryPdf marca OCR cuando no hay texto seleccionable', async () => {
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  pdfTextItems = [{ str: 'x' }];

  queryHandler = (table, _calls) => {
    if (table === 'storage_download') return storagePdf();
    if (table === 'courses') return { data: [], error: null };
    if (table === 'students') return { data: [], error: null };
    if (table === 'disciplinary_process_files') return { data: null, error: null };
    if (table.startsWith('rpc_get_suggested_letter_type')) return { data: 'none', error: null };
    if (table === 'document_analyses') {
      return { data: { id: 'analysis-2', analyzed_at: '2026-04-10T12:00:00.000Z' }, error: null };
    }
    return { data: null, error: null };
  };

  const result = await analyzeDisciplinaryPdf({
    bucket: 'disciplinary-processes',
    storagePath: `${TENANT_ID}/expediente.pdf`,
    fileName: 'expediente.pdf',
    tenantId: TENANT_ID,
  });

  assert.equal(result.processing_status, 'ocr_required');
  assert.ok(result.warnings.some((warning) => /OCR/.test(warning)));
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('analyzeDisciplinaryPdf rechaza bucket no permitido', async () => {
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

  await assert.rejects(
    () =>
      analyzeDisciplinaryPdf({
        bucket: 'otro-bucket',
        storagePath: `${TENANT_ID}/expediente.pdf`,
        fileName: 'expediente.pdf',
        tenantId: TENANT_ID,
      }),
    /Bucket de documentos disciplinarios no permitido/,
  );
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('analyzeDisciplinaryPdf rechaza ruta de storage con traversal', async () => {
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

  await assert.rejects(
    () =>
      analyzeDisciplinaryPdf({
        bucket: 'disciplinary-processes',
        storagePath: `../${TENANT_ID}/expediente.pdf`,
        fileName: 'expediente.pdf',
        tenantId: TENANT_ID,
      }),
    /Ruta de archivo no válida/,
  );
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('confirmDisciplinaryProcess crea el proceso completo', async () => {
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  pdfTextItems = [{ str: '10/04/2026 Tipo: Negativa Profesor: Ana Lopez Falta reiterada.' }];

  queryHandler = (table, calls) => {
    if (table === 'storage_download') return storagePdf();
    if (table === 'courses' && calls.includes('eq:id')) {
      return { data: { id: 'course-1', name: '1° Medio A' }, error: null };
    }
    if (table === 'courses') return { data: [{ id: 'course-1', name: '1° Medio A' }], error: null };
    if (table === 'students') {
      return {
        data: {
          id: STUDENT_ID,
          tenant_id: TENANT_ID,
          full_name: 'Juan Perez',
          course_id: 'course-1',
        },
        error: null,
      };
    }
    if (table === 'document_analyses' && calls.includes('eq:id')) {
      return {
        data: { id: 'analysis-1', file_hash: PDF_HASH, status: 'completed' },
        error: null,
      };
    }
    if (table === 'document_analyses') return { data: null, error: null };
    if (table === 'disciplinary_process_files' && calls.includes('eq:storage_path')) {
      return { data: null, error: null };
    }
    if (table === 'disciplinary_process_files' && calls.includes('insert')) {
      return { data: null, error: null };
    }
    if (table === 'disciplinary_process_files') return { data: null, error: null };
    if (table.startsWith('rpc_generate_process_number')) {
      return { data: 'PROC-2026-001', error: null };
    }
    if (table === 'disciplinary_processes') {
      return { data: { id: 'process-1', process_number: 'PROC-2026-001' }, error: null };
    }
    if (table === 'inspectorate_records' && calls.includes('select')) {
      return { data: [], error: null };
    }
    if (table === 'inspectorate_records') return { data: null, error: null };
    if (table === 'cartas_disciplinarias') return { data: [], error: null };
    if (table === 'etapas_disciplinarias') return { data: [], error: null };
    if (table === 'disciplinary_annotations_detected') return { data: null, error: null };
    return { data: null, error: null };
  };

  const result = await confirmDisciplinaryProcess({
    bucket: 'disciplinary-processes',
    storagePath: `${TENANT_ID}/expediente.pdf`,
    fileName: 'expediente.pdf',
    fileHash: PDF_HASH,
    tenantId: TENANT_ID,
    studentId: STUDENT_ID,
    suggestedLetterType: 'amonestacion',
    annotations: [
      {
        raw_text: 'Falta reiterada.',
        type: 'negative',
        sequence_number: 1,
        detected_date: '2026-04-10',
      },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(result.processId, 'process-1');
  assert.equal(result.processNumber, 'PROC-2026-001');
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('confirmDisciplinaryProcess rechaza hash que no coincide con el PDF', async () => {
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  pdfTextItems = [{ str: '10/04/2026 Tipo: Negativa Profesor: Ana Lopez Falta reiterada.' }];

  queryHandler = (table, _calls) => {
    if (table === 'storage_download') return storagePdf();
    return { data: null, error: null };
  };

  await assert.rejects(
    () =>
      confirmDisciplinaryProcess({
        bucket: 'disciplinary-processes',
        storagePath: `${TENANT_ID}/expediente.pdf`,
        fileName: 'expediente.pdf',
        fileHash: 'hash-incompatible',
        tenantId: TENANT_ID,
        studentId: STUDENT_ID,
        suggestedLetterType: 'none',
        annotations: [],
      }),
    /hash informado no coincide/,
  );
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('confirmDisciplinaryProcess detecta PDF duplicado por hash', async () => {
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  pdfTextItems = [{ str: '10/04/2026 Tipo: Negativa Profesor: Ana Lopez Falta reiterada.' }];

  queryHandler = (table, calls) => {
    if (table === 'storage_download') return storagePdf();
    if (table === 'students') {
      return {
        data: { id: STUDENT_ID, tenant_id: TENANT_ID, full_name: 'Juan Perez', course_id: null },
        error: null,
      };
    }
    if (table === 'document_analyses') return { data: null, error: null };
    if (table === 'disciplinary_process_files' && calls.includes('eq:storage_path')) {
      return { data: null, error: null };
    }
    if (table === 'disciplinary_process_files' && calls.includes('eq:file_hash')) {
      return {
        data: {
          process_id: 'process-antiguo',
          student_id: STUDENT_ID,
          uploaded_at: '2026-04-01T12:00:00.000Z',
        },
        error: null,
      };
    }
    if (table === 'disciplinary_processes') {
      return { data: { process_number: 'PROC-2026-000' }, error: null };
    }
    return { data: null, error: null };
  };

  await assert.rejects(
    () =>
      confirmDisciplinaryProcess({
        bucket: 'disciplinary-processes',
        storagePath: `${TENANT_ID}/expediente.pdf`,
        fileName: 'expediente.pdf',
        fileHash: PDF_HASH,
        tenantId: TENANT_ID,
        studentId: STUDENT_ID,
        suggestedLetterType: 'none',
        annotations: [],
      }),
    /ya fue registrado en el proceso PROC-2026-000/,
  );
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('confirmDisciplinaryProcess valida que el estudiante pertenezca al tenant', async () => {
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  pdfTextItems = [{ str: '10/04/2026 Tipo: Negativa Profesor: Ana Lopez Falta reiterada.' }];

  queryHandler = (table, _calls) => {
    if (table === 'storage_download') return storagePdf();
    if (table === 'students') return { data: null, error: null };
    return { data: null, error: null };
  };

  await assert.rejects(
    () =>
      confirmDisciplinaryProcess({
        bucket: 'disciplinary-processes',
        storagePath: `${TENANT_ID}/expediente.pdf`,
        fileName: 'expediente.pdf',
        fileHash: PDF_HASH,
        tenantId: TENANT_ID,
        studentId: 'otro-estudiante',
        suggestedLetterType: 'none',
        annotations: [],
      }),
    /no pertenece al establecimiento activo/,
  );
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('confirmDisciplinaryProcess reutiliza proceso existente con idempotencyKey', async () => {
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  pdfTextItems = [{ str: '10/04/2026 Tipo: Negativa Profesor: Ana Lopez Falta reiterada.' }];

  queryHandler = (table, calls) => {
    if (table === 'storage_download') return storagePdf();
    if (table === 'courses' && calls.includes('eq:id')) {
      return { data: { id: 'course-1', name: '1° Medio A' }, error: null };
    }
    if (table === 'courses') return { data: [{ id: 'course-1', name: '1° Medio A' }], error: null };
    if (table === 'students') {
      return {
        data: {
          id: STUDENT_ID,
          tenant_id: TENANT_ID,
          full_name: 'Juan Perez',
          course_id: 'course-1',
        },
        error: null,
      };
    }
    if (table === 'document_analyses' && calls.includes('eq:id')) {
      return {
        data: { id: 'analysis-1', file_hash: PDF_HASH, status: 'completed' },
        error: null,
      };
    }
    if (table === 'document_analyses') return { data: null, error: null };
    if (table === 'disciplinary_process_files' && calls.includes('eq:storage_path')) {
      return {
        data: {
          process_id: 'process-existente',
          disciplinary_processes: { process_number: 'PROC-EXISTENTE' },
        },
        error: null,
      };
    }
    if (table === 'inspectorate_records' && calls.includes('select')) {
      return { data: [], error: null };
    }
    if (table === 'inspectorate_records') return { data: null, error: null };
    if (table === 'cartas_disciplinarias') return { data: [], error: null };
    if (table === 'etapas_disciplinarias') return { data: [], error: null };
    return { data: null, error: null };
  };

  const result = await confirmDisciplinaryProcess({
    bucket: 'disciplinary-processes',
    storagePath: `${TENANT_ID}/expediente.pdf`,
    fileName: 'expediente.pdf',
    fileHash: PDF_HASH,
    tenantId: TENANT_ID,
    studentId: STUDENT_ID,
    suggestedLetterType: 'compromiso',
    idempotencyKey: 'misma-carga',
    annotations: [
      {
        raw_text: 'Falta reiterada.',
        type: 'negative',
        sequence_number: 1,
        detected_date: '2026-04-10',
      },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(result.processId, 'process-existente');
  assert.equal(result.processNumber, 'PROC-EXISTENTE');
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test('lanza error si Supabase no está configurado', async () => {
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.VITE_SUPABASE_ANON_KEY;
  delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  await assert.rejects(
    () =>
      analyzeDisciplinaryPdf({
        bucket: 'disciplinary-processes',
        storagePath: `${TENANT_ID}/expediente.pdf`,
        fileName: 'expediente.pdf',
        tenantId: TENANT_ID,
      }),
    /Supabase no configurado/,
  );
});
