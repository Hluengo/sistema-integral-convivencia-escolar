/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Annotation, AnotacionStudent, DocumentAnalysis } from '../../lib/types';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

/** Cadena encadenable para mockear `supabase.from(...)` en tests. */
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
  gte(_column: string, _value: unknown) {
    return this;
  }
  lt(_column: string, _value: unknown) {
    return this;
  }
  order(_column: string, _opts?: { ascending?: boolean }) {
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

/** Fila de `inspectorate_records` tal como la devuelve la API (columnas snake_case). */
function makeInspectorateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ann-1',
    student_id: 'student-1',
    date_time: '2026-08-01T12:00:00.000Z',
    observation: 'Interrupción reiterada de la clase.',
    severity: 'Grave',
    type: 'Negativa',
    registered_by: 'Inspectoría',
    created_at: '2026-08-01T12:00:00.000Z',
    created_by: 'user-1',
    pdf_file_path: null,
    ...overrides,
  };
}

async function withSupabaseMocks(options: {
  from?: (table: string) => { data: unknown; error: Error | null };
  rpc?: (fn: string, params?: unknown) => Promise<{ data: unknown; error: Error | null }>;
  tenantId?: string | null;
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const [{ supabase }, { useAuthStore }] = await Promise.all([
    import('../lib/supabase'),
    import('../../lib/stores/authStore'),
  ]);
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.from;
  const originalRpc = mutable.rpc;
  const originalConsoleError = console.error;
  const originalTenantId = useAuthStore.getState().tenantId;

  mutable.from = (table) =>
    new MockQueryBuilder(
      table,
      (options.from ?? (() => ({ data: null, error: null })))(table) as never,
    );
  mutable.rpc = options.rpc ?? (async () => ({ data: null, error: null }));
  console.error = () => undefined;
  useAuthStore.setState({
    tenantId: options.tenantId === undefined ? 'tenant-1' : options.tenantId,
  });

  try {
    return await options.fn();
  } finally {
    mutable.from = originalFrom;
    mutable.rpc = originalRpc;
    console.error = originalConsoleError;
    useAuthStore.setState({ tenantId: originalTenantId });
  }
}

describe('fetchAnnotations', () => {
  it('retorna vacío cuando hay error de lectura', async () => {
    const result = await withSupabaseMocks({
      from: () => ({ data: null, error: new Error('boom') }),
      fn: async () => {
        const { fetchAnnotations } = await import('./annotations.service');
        return fetchAnnotations();
      },
    });
    assert.deepEqual(result, []);
  });

  it('mapea filas de inspectorate_records a annotations', async () => {
    const result = await withSupabaseMocks({
      from: () => ({ data: [makeInspectorateRow()], error: null }),
      fn: async () => {
        const { fetchAnnotations } = await import('./annotations.service');
        return fetchAnnotations('student-1');
      },
    });
    const list = result as Annotation[];
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'ann-1');
    assert.equal(list[0].text, 'Interrupción reiterada de la clase.');
    assert.equal(list[0].date, '2026-08-01T12:00:00.000Z');
  });
});

describe('fetchDocumentAnalyses', () => {
  it('retorna vacío cuando hay error', async () => {
    const result = await withSupabaseMocks({
      from: () => ({ data: null, error: new Error('boom') }),
      fn: async () => {
        const { fetchDocumentAnalyses } = await import('./annotations.service');
        return fetchDocumentAnalyses('student-1');
      },
    });
    assert.deepEqual(result, []);
  });

  it('retorna las filas de document_analyses', async () => {
    const row = {
      id: 'da-1',
      student_id: 'student-1',
      file_name: 'resumen.pdf',
      negativas: 3,
      positivas: 1,
      informativas: 0,
      analyzed_at: '2026-08-01T12:00:00.000Z',
      tenant_id: 'tenant-1',
      created_at: '2026-08-01T12:00:00.000Z',
      status: 'analizada',
    };
    const result = await withSupabaseMocks({
      from: () => ({ data: [row], error: null }),
      fn: async () => {
        const { fetchDocumentAnalyses } = await import('./annotations.service');
        return fetchDocumentAnalyses('student-1');
      },
    });
    assert.equal((result as DocumentAnalysis[])[0].file_name, 'resumen.pdf');
  });
});

describe('updateAnnotation', () => {
  it('rechaza sin tenant en la sesión', async () => {
    await assert.rejects(
      withSupabaseMocks({
        tenantId: null,
        fn: async () => {
          const { updateAnnotation } = await import('./annotations.service');
          return updateAnnotation({
            id: 'ann-1',
            text: 'Nueva observación',
            date: '2026-08-02',
            severity: 'Grave',
            type: 'Negativa',
          });
        },
      }),
      /No se pudo identificar el establecimiento/,
    );
  });

  it('rechaza observación vacía', async () => {
    await assert.rejects(
      withSupabaseMocks({
        fn: async () => {
          const { updateAnnotation } = await import('./annotations.service');
          return updateAnnotation({
            id: 'ann-1',
            text: '   ',
            date: '2026-08-02',
            severity: 'Grave',
            type: 'Negativa',
          });
        },
      }),
      /no puede quedar vacía/,
    );
  });

  it('actualiza la anotación y devuelve la fila mapeada', async () => {
    const result = await withSupabaseMocks({
      from: () => ({
        data: makeInspectorateRow({ observation: 'Observación actualizada.' }),
        error: null,
      }),
      fn: async () => {
        const { updateAnnotation } = await import('./annotations.service');
        return updateAnnotation({
          id: 'ann-1',
          text: 'Observación actualizada.',
          date: '2026-08-02',
          severity: 'Grave',
          type: 'Negativa',
        });
      },
    });
    assert.equal((result as Annotation).text, 'Observación actualizada.');
  });

  it('propaga el error de la base de datos', async () => {
    await assert.rejects(
      withSupabaseMocks({
        from: () => ({ data: null, error: new Error('constraint violated') }),
        fn: async () => {
          const { updateAnnotation } = await import('./annotations.service');
          return updateAnnotation({
            id: 'ann-1',
            text: 'Observación',
            date: '2026-08-02',
            severity: 'Grave',
            type: 'Negativa',
          });
        },
      }),
      /constraint violated/,
    );
  });
});

describe('fetchAnnualAnnotationTrends', () => {
  it('rechaza sin tenant', async () => {
    await assert.rejects(
      withSupabaseMocks({
        tenantId: null,
        fn: async () => {
          const { fetchAnnualAnnotationTrends } = await import('./annotations.service');
          return fetchAnnualAnnotationTrends(2026);
        },
      }),
      /No se pudo identificar el establecimiento/,
    );
  });

  it('rechaza años escolares inválidos', async () => {
    await assert.rejects(
      withSupabaseMocks({
        fn: async () => {
          const { fetchAnnualAnnotationTrends } = await import('./annotations.service');
          return fetchAnnualAnnotationTrends(1999);
        },
      }),
      /año escolar/,
    );
    await assert.rejects(
      withSupabaseMocks({
        fn: async () => {
          const { fetchAnnualAnnotationTrends } = await import('./annotations.service');
          return fetchAnnualAnnotationTrends(2026.5);
        },
      }),
      /año escolar/,
    );
  });

  it('mapea las filas del rango anual', async () => {
    const rows = [
      { date_time: '2026-03-05T10:00:00.000Z', severity: 'Grave', type: 'Negativa' },
      { date_time: '2026-11-20T09:00:00.000Z', severity: 'Leve', type: 'Negativa' },
    ];
    const result = await withSupabaseMocks({
      from: () => ({ data: rows, error: null }),
      fn: async () => {
        const { fetchAnnualAnnotationTrends } = await import('./annotations.service');
        return fetchAnnualAnnotationTrends(2026);
      },
    });
    const trend = result as Array<{ dateTime: string; severity: string }>;
    assert.equal(trend[0].dateTime, '2026-03-05T10:00:00.000Z');
    assert.equal(trend[1].severity, 'Leve');
  });

  it('propaga errores de lectura', async () => {
    await assert.rejects(
      withSupabaseMocks({
        from: () => ({ data: null, error: new Error('db down') }),
        fn: async () => {
          const { fetchAnnualAnnotationTrends } = await import('./annotations.service');
          return fetchAnnualAnnotationTrends(2026);
        },
      }),
      /db down/,
    );
  });
});

describe('fetchStudentsWithAnnotationCounts', () => {
  it('mapea el resumen RPC de estudiantes', async () => {
    const result = await withSupabaseMocks({
      rpc: async () => ({
        data: [
          {
            id: 's-1',
            full_name: 'Estudiante Uno',
            course_id: 'c-1',
            rut: '11.111.111-1',
            course_name: '8° Básico A',
            annotations_count: 6,
            positive_annotations_count: 2,
            informative_annotations_count: 1,
            last_annotation_date: '2026-08-01',
            disciplinary_status: 'amonestacion',
            ai_analysis: { negativas: 3, positivas: 1, informativas: 0 },
          },
        ],
        error: null,
      }),
      fn: async () => {
        const { fetchStudentsWithAnnotationCounts } = await import('./annotations.service');
        return fetchStudentsWithAnnotationCounts();
      },
    });
    const students = result as AnotacionStudent[];
    assert.equal(students.length, 1);
    assert.equal(students[0].full_name, 'Estudiante Uno');
    assert.equal(students[0].annotations_count, 6);
    assert.equal(students[0].ai_analysis?.negativas, 3);
    assert.equal(students[0].course_name, '8° Básico A');
  });

  it('propaga la falla de la RPC', async () => {
    await assert.rejects(
      withSupabaseMocks({
        rpc: async () => ({ data: null, error: new Error('rpc not found') }),
        fn: async () => {
          const { fetchStudentsWithAnnotationCounts } = await import('./annotations.service');
          return fetchStudentsWithAnnotationCounts();
        },
      }),
      /rpc not found/,
    );
  });
});

describe('fetchAnnotationStageCounts', () => {
  it('parsea los conteos por etapa', async () => {
    const result = await withSupabaseMocks({
      rpc: async () => ({
        data: [
          { stage: 'none', total_count: 12, pending_count: 0, processed_count: 12 },
          { stage: 'amonestacion', total_count: 8, pending_count: 3, processed_count: 5 },
        ],
        error: null,
      }),
      fn: async () => {
        const { fetchAnnotationStageCounts } = await import('./annotations.service');
        return fetchAnnotationStageCounts();
      },
    });
    const counts = result as Record<string, { total: number }>;
    assert.ok(counts.amonestacion);
    assert.equal(counts.amonestacion.total, 8);
  });

  it('propaga la falla de la RPC', async () => {
    await assert.rejects(
      withSupabaseMocks({
        rpc: async () => ({ data: null, error: new Error('rpc missing') }),
        fn: async () => {
          const { fetchAnnotationStageCounts } = await import('./annotations.service');
          return fetchAnnotationStageCounts();
        },
      }),
      /rpc missing/,
    );
  });
});

describe('fetchTeacherAnnotationRanking', () => {
  it('mapea el ranking docente', async () => {
    const result = await withSupabaseMocks({
      rpc: async () => ({
        data: [
          {
            teacher_name: 'Profesor A',
            negative_count: 5,
            positive_count: 2,
            informative_count: 1,
            total_count: 8,
          },
        ],
        error: null,
      }),
      fn: async () => {
        const { fetchTeacherAnnotationRanking } = await import('./annotations.service');
        return fetchTeacherAnnotationRanking();
      },
    });
    const ranking = result as Array<{ teacher_name: string; negative_count: number }>;
    assert.equal(ranking[0].teacher_name, 'Profesor A');
    assert.equal(ranking[0].negative_count, 5);
  });

  it('usa "Sin profesor" cuando falta el nombre', async () => {
    const result = await withSupabaseMocks({
      rpc: async () => ({
        data: [
          {
            teacher_name: '',
            negative_count: 1,
            positive_count: 0,
            informative_count: 0,
            total_count: 1,
          },
        ],
        error: null,
      }),
      fn: async () => {
        const { fetchTeacherAnnotationRanking } = await import('./annotations.service');
        return fetchTeacherAnnotationRanking();
      },
    });
    assert.equal((result as Array<{ teacher_name: string }>)[0].teacher_name, 'Sin profesor');
  });

  it('propaga la falla de la RPC', async () => {
    await assert.rejects(
      withSupabaseMocks({
        rpc: async () => ({ data: null, error: new Error('rpc denied') }),
        fn: async () => {
          const { fetchTeacherAnnotationRanking } = await import('./annotations.service');
          return fetchTeacherAnnotationRanking();
        },
      }),
      /rpc denied/,
    );
  });
});

describe('fetchStudentAnnotationRanking', () => {
  it('mapea el ranking estudiantil', async () => {
    const result = await withSupabaseMocks({
      rpc: async () => ({
        data: [
          {
            student_id: 's-1',
            student_name: 'Estudiante',
            course_name: '8° Básico A',
            negative_count: 7,
          },
        ],
        error: null,
      }),
      fn: async () => {
        const { fetchStudentAnnotationRanking } = await import('./annotations.service');
        return fetchStudentAnnotationRanking();
      },
    });
    const ranking = result as Array<{ student_name: string; negative_count: number }>;
    assert.equal(ranking[0].student_name, 'Estudiante');
    assert.equal(ranking[0].negative_count, 7);
  });

  it('propaga la falla de la RPC', async () => {
    await assert.rejects(
      withSupabaseMocks({
        rpc: async () => ({ data: null, error: new Error('rpc denied') }),
        fn: async () => {
          const { fetchStudentAnnotationRanking } = await import('./annotations.service');
          return fetchStudentAnnotationRanking();
        },
      }),
      /rpc denied/,
    );
  });
});
