/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Causa, ChecklistItem, BitacoraEntry } from '../../lib/types';
import type { CausaDocumentSnapshot } from '../../../features/causas/notificacionDocgen/types';
import type { CausaDocumentRow } from './causaDocuments.service';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

/** Cadena encadenable para mockear `supabase.from(...)` y `supabase.rpc(...)`. */
class MockQueryBuilder<T> {
  table: string;
  result: { data: T | null; error: Error | null };

  constructor(table: string, result: { data: T | null; error: Error | null }) {
    this.table = table;
    this.result = result;
  }

  select(_columns?: string) {
    return this;
  }
  eq(_column: string, _value: unknown) {
    return this;
  }
  order(_column: string, _opts?: { ascending?: boolean }) {
    return this;
  }
  insert(_row: Record<string, unknown>) {
    return this;
  }
  update(_row: Record<string, unknown>) {
    return this;
  }
  single() {
    return this.result;
  }
  async then(
    onFulfilled?: (value: { data: T | null; error: Error | null }) => unknown,
  ): Promise<unknown> {
    return onFulfilled ? onFulfilled(this.result) : this.result;
  }
}

interface MutableSupabase {
  from: (table: string) => MockQueryBuilder<unknown>;
  rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: Error | null }>;
}

async function withCausaDocsMocks(options: {
  resultForTable: (table: string) => { data: unknown; error: Error | null };
  rpc?: (fn: string, params?: unknown) => Promise<{ data: unknown; error: Error | null }>;
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.from;
  const originalRpc = mutable.rpc;
  const originalConsoleError = console.error;
  mutable.from = (table) =>
    new MockQueryBuilder(
      table,
      (options.resultForTable ?? (() => ({ data: null, error: null })))(table) as never,
    );
  mutable.rpc = options.rpc ?? (async () => ({ data: null, error: null }));
  console.error = () => undefined;
  try {
    return await options.fn();
  } finally {
    mutable.from = originalFrom;
    mutable.rpc = originalRpc;
    console.error = originalConsoleError;
  }
}

function makeSnapshot(overrides: Partial<CausaDocumentSnapshot> = {}): CausaDocumentSnapshot {
  return {
    templateVersion: 'notificacion-inicio-indagacion-v1',
    docType: 'notificacion_inicio_indagacion',
    title: 'Notificación de Inicio de Indagación',
    content: {
      fundamentoProcedimiento: 'texto',
      hallazgoIncidente: 'texto',
      evidenciaTestimonios: 'texto',
      atenuantesAgravantes: 'texto',
      calificacionFalta: 'texto',
      medidasEnEvaluacion: 'texto',
      advertenciaEspecial: 'texto',
      garantiasDebidoProceso: 'texto',
      confidencialidad: 'texto',
    },
    expediente: {
      expedienteId: 'DC-2026-001',
      studentName: 'Estudiante',
      course: '8° Básico A',
      fechaApertura: '2026-08-01',
      responsable: 'Inspectoría',
      tipoInfraccion: 'Leve',
      estadoActual: 'Recepción de Denuncia',
      observaciones: '',
      medidasEjecutadas: [],
    },
    studentName: 'Estudiante',
    apoderadoName: 'Apoderado',
    emittedBy: 'user-1',
    emissionDate: '2026-08-01',
    emittedAt: '2026-08-01T12:00:00.000Z',
    ...overrides,
  };
}

function makeCausa(overrides: Partial<Causa> = {}): Causa {
  return {
    id: 'DC-2026-001',
    estudianteNombre: 'Estudiante',
    estudianteCurso: '8° Básico A',
    nnaProtectedName: 'E.P.',
    runEstudiante: '23.456.789-K',
    fechaApertura: '2026-08-01',
    estadoActual: 'Recepción de Denuncia' as Causa['estadoActual'],
    tipoInfraccion: 'Leve' as Causa['tipoInfraccion'],
    responsable: 'Inspectoría',
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: '2026-08-01',
    observaciones: '',
    bitacora: [],
    checklistDebidoProceso: [],
    ...overrides,
  };
}

function makeDocRow(overrides: Partial<CausaDocumentRow> = {}): CausaDocumentRow {
  return {
    id: 'doc-1',
    causa_id: 'DC-2026-001',
    doc_type: 'notificacion_inicio_indagacion',
    status: 'Pendiente',
    content_snapshot: null,
    created_by: 'user-1',
    emitted_by: 'user-1',
    student_name: 'Estudiante',
    apoderado_name: 'Apoderado',
    course: '8° Básico A',
    emission_date: '2026-08-01',
    notified_at: null,
    tenant_id: 'tenant-1',
    created_at: '2026-08-01T12:00:00.000Z',
    updated_at: '2026-08-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('createPendingCausaDocument', () => {
  it('inserta el borrador y devuelve la fila creada', async () => {
    const result = await withCausaDocsMocks({
      resultForTable: () => ({ data: makeDocRow(), error: null }),
      fn: async () => {
        const { createPendingCausaDocument } = await import('./causaDocuments.service');
        return createPendingCausaDocument(makeCausa(), makeSnapshot());
      },
    });
    assert.equal((result as CausaDocumentRow).id, 'doc-1');
    assert.equal((result as CausaDocumentRow).status, 'Pendiente');
  });

  it('retorna null cuando falla la inserción', async () => {
    const result = await withCausaDocsMocks({
      resultForTable: () => ({ data: null, error: new Error('insert denied') }),
      fn: async () => {
        const { createPendingCausaDocument } = await import('./causaDocuments.service');
        return createPendingCausaDocument(makeCausa(), makeSnapshot());
      },
    });
    assert.equal(result, null);
  });
});

describe('fetchCausaDocuments', () => {
  it('lista los documentos de la causa', async () => {
    const result = await withCausaDocsMocks({
      resultForTable: () => ({ data: [makeDocRow(), makeDocRow({ id: 'doc-2' })], error: null }),
      fn: async () => {
        const { fetchCausaDocuments } = await import('./causaDocuments.service');
        return fetchCausaDocuments('DC-2026-001');
      },
    });
    const rows = result as CausaDocumentRow[];
    assert.equal(rows.length, 2);
    assert.equal(rows[0].id, 'doc-1');
  });

  it('retorna vacío cuando hay error', async () => {
    const result = await withCausaDocsMocks({
      resultForTable: () => ({ data: null, error: new Error('boom') }),
      fn: async () => {
        const { fetchCausaDocuments } = await import('./causaDocuments.service');
        return fetchCausaDocuments('DC-2026-001');
      },
    });
    assert.deepEqual(result, []);
  });
});

describe('saveCausaDocumentSnapshot', () => {
  it('guarda el snapshot y retorna true', async () => {
    const result = await withCausaDocsMocks({
      resultForTable: () => ({ data: null, error: null }),
      fn: async () => {
        const { saveCausaDocumentSnapshot } = await import('./causaDocuments.service');
        return saveCausaDocumentSnapshot('doc-1', makeSnapshot());
      },
    });
    assert.equal(result, true);
  });

  it('retorna false cuando falla', async () => {
    const result = await withCausaDocsMocks({
      resultForTable: () => ({ data: null, error: new Error('boom') }),
      fn: async () => {
        const { saveCausaDocumentSnapshot } = await import('./causaDocuments.service');
        return saveCausaDocumentSnapshot('doc-1', makeSnapshot());
      },
    });
    assert.equal(result, false);
  });
});

describe('markCausaDocumentNotified', () => {
  const checklistItem: ChecklistItem = {
    id: 'chk_rec_3',
    label: 'Notificación de Inicio de Indagación',
    descripcion: 'Hito',
    completado: true,
    fechaCompletado: '2026-08-01',
    requeridoPor: 'Circular 482',
    registradoPor: 'user-1',
  };

  const bitacoraEntry: BitacoraEntry = {
    id: 'b-1',
    fecha: '2026-08-01T12:00:00.000Z',
    tipo: 'Notificación',
    titulo: 'Notificación emitida',
    descripcion: 'Descripción',
    participantes: ['user-1'],
  };

  it('invoca la RPC con payloads snake_case y retorna ok', async () => {
    let rpcParams: Record<string, unknown> | undefined;
    const result = await withCausaDocsMocks({
      resultForTable: () => ({ data: null, error: null }),
      rpc: async (fn, params) => {
        assert.equal(fn, 'mark_causa_document_notified');
        rpcParams = params as Record<string, unknown>;
        return { data: null, error: null };
      },
      fn: async () => {
        const { markCausaDocumentNotified } = await import('./causaDocuments.service');
        return markCausaDocumentNotified('doc-1', makeSnapshot(), checklistItem, bitacoraEntry);
      },
    });
    assert.deepEqual(result, { ok: true, error: null });
    assert.equal(rpcParams?.p_document_id, 'doc-1');
    const payload = rpcParams?.p_checklist_item as Record<string, unknown>;
    assert.equal(payload.requerido_por, 'Circular 482');
    const bitacoraPayload = rpcParams?.p_bitacora_entry as Record<string, unknown>;
    assert.equal(bitacoraPayload.tipo, 'Notificación');
  });

  it('retorna error cuando falla la RPC', async () => {
    const result = (await withCausaDocsMocks({
      resultForTable: () => ({ data: null, error: null }),
      rpc: async () => ({ data: null, error: new Error('rpc denied') }),
      fn: async () => {
        const { markCausaDocumentNotified } = await import('./causaDocuments.service');
        return markCausaDocumentNotified('doc-1', makeSnapshot(), checklistItem, bitacoraEntry);
      },
    })) as { ok: boolean; error: string | null };
    assert.equal(result.ok, false);
    assert.match(String(result.error), /rpc denied/);
  });
});

describe('annulCausaDocument', () => {
  it('anula el documento Pendiente y retorna true', async () => {
    const result = await withCausaDocsMocks({
      resultForTable: () => ({ data: null, error: null }),
      fn: async () => {
        const { annulCausaDocument } = await import('./causaDocuments.service');
        return annulCausaDocument('doc-1');
      },
    });
    assert.equal(result, true);
  });

  it('retorna false cuando falla', async () => {
    const result = await withCausaDocsMocks({
      resultForTable: () => ({ data: null, error: new Error('boom') }),
      fn: async () => {
        const { annulCausaDocument } = await import('./causaDocuments.service');
        return annulCausaDocument('doc-1');
      },
    });
    assert.equal(result, false);
  });
});
