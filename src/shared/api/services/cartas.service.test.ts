/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { CartaDisciplinaria } from '../../lib/types';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

/**
 * Cadena de query builder encadenable para mockear `supabase.from(...)`.
 * Cada llamada registra la tabla y permite inyectar el resultado final.
 */
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
  in(_column: string, _values: unknown[]) {
    return this;
  }
  order(_column: string, _opts?: { ascending?: boolean }) {
    return this;
  }
  limit(_n: number) {
    return this;
  }
  single() {
    return this.result;
  }
  maybeSingle() {
    return this.result;
  }
  insert(_row: Record<string, unknown>) {
    return this;
  }
  update(_row: Record<string, unknown>) {
    return this;
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

function installFromMock(
  resultForTable: (table: string) => { data: unknown; error: Error | null },
) {
  return import('../lib/supabase').then(({ supabase }) => {
    const mutable = supabase as unknown as MutableSupabase;
    const originalFrom = mutable.from;
    const originalRpc = mutable.rpc;
    const originalConsoleError = console.error;
    mutable.from = (table) => new MockQueryBuilder(table, resultForTable(table) as never);
    mutable.rpc = async () => ({ data: null, error: null });
    console.error = () => undefined;
    return {
      restore() {
        mutable.from = originalFrom;
        mutable.rpc = originalRpc;
        console.error = originalConsoleError;
      },
    };
  });
}

function makeCarta(overrides: Partial<CartaDisciplinaria> = {}): CartaDisciplinaria {
  return {
    id: 'carta-1',
    student_id: 'student-1',
    letter_type: 'Amonestación Escrita',
    emission_date: '2026-08-01',
    status: 'Vigente',
    emitted_by: 'Inspectoría',
    supervisor_name: undefined,
    apoderado_name: 'Apoderado',
    annotations_count: 5,
    origin: 'platform',
    school_year: 2026,
    student_name: 'Estudiante',
    course: '8° Básico A',
    regulation_basis: 'RICE 2026',
    observations: undefined,
    created_at: '2026-08-01T12:00:00.000Z',
    content_snapshot: null,
    ...overrides,
  };
}

describe('resolveCartaWorkflowStatus', () => {
  it('retorna none cuando no hay carta', async () => {
    const { resolveCartaWorkflowStatus } = await import('./cartas.service');
    assert.equal(resolveCartaWorkflowStatus(null), 'none');
    assert.equal(resolveCartaWorkflowStatus(undefined), 'none');
  });

  it('retorna annulled cuando la carta está anulada o tiene evento annulled', async () => {
    const { resolveCartaWorkflowStatus } = await import('./cartas.service');
    assert.equal(resolveCartaWorkflowStatus(makeCarta({ status: 'Anulada' })), 'annulled');
    assert.equal(
      resolveCartaWorkflowStatus(makeCarta({ annulled_at: '2026-08-02T10:00:00.000Z' })),
      'annulled',
    );
  });

  it('retorna archived cuando la carta fue archivada', async () => {
    const { resolveCartaWorkflowStatus } = await import('./cartas.service');
    assert.equal(
      resolveCartaWorkflowStatus(makeCarta({ workflow_status: 'archived' })),
      'archived',
    );
    assert.equal(
      resolveCartaWorkflowStatus(makeCarta({ archived_at: '2026-08-02T10:00:00.000Z' })),
      'archived',
    );
  });

  it('retorna completed para cartas físicas o con eventos de trámite', async () => {
    const { resolveCartaWorkflowStatus } = await import('./cartas.service');
    assert.equal(resolveCartaWorkflowStatus(makeCarta({ origin: 'physical' })), 'completed');
    assert.equal(
      resolveCartaWorkflowStatus(makeCarta({ workflow_status: 'completed' })),
      'completed',
    );
    assert.equal(
      resolveCartaWorkflowStatus(makeCarta({ printed_at: '2026-08-02T10:00:00.000Z' })),
      'completed',
    );
    assert.equal(
      resolveCartaWorkflowStatus(makeCarta({ registered_at: '2026-08-02T10:00:00.000Z' })),
      'completed',
    );
    assert.equal(
      resolveCartaWorkflowStatus(makeCarta({ processed_manually_at: '2026-08-02T10:00:00.000Z' })),
      'completed',
    );
  });

  it('retorna pending en caso contrario', async () => {
    const { resolveCartaWorkflowStatus } = await import('./cartas.service');
    assert.equal(resolveCartaWorkflowStatus(makeCarta()), 'pending');
    assert.equal(
      resolveCartaWorkflowStatus(makeCarta({ suggested_at: '2026-08-01T10:00:00.000Z' })),
      'pending',
    );
  });
});

describe('getCartaWorkflowLabel', () => {
  it('traduce cada estado a español chileno', async () => {
    const { getCartaWorkflowLabel } = await import('./cartas.service');
    assert.equal(getCartaWorkflowLabel(null), 'Sin carta requerida');
    assert.equal(getCartaWorkflowLabel(makeCarta({ status: 'Anulada' })), 'Carta anulada');
    assert.equal(
      getCartaWorkflowLabel(makeCarta({ workflow_status: 'archived' })),
      'Carta archivada',
    );
    assert.equal(getCartaWorkflowLabel(makeCarta({ origin: 'physical' })), 'Carta realizada');
    assert.equal(getCartaWorkflowLabel(makeCarta()), 'Carta pendiente');
    assert.equal(
      getCartaWorkflowLabel(makeCarta({ suggested_at: '2026-08-01T10:00:00.000Z' })),
      'Carta sugerida',
    );
  });
});

describe('registerPhysicalCartaForStudent', () => {
  it('valida el input con Zod y retorna mensaje de error', async () => {
    const { registerPhysicalCartaForStudent } = await import('./cartas.service');
    const result = await registerPhysicalCartaForStudent({
      studentId: 'no-es-uuid',
      letterType: 'Amonestación Escrita',
      emissionDate: '2026-08-01',
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /no es válido|válida/i);
  });

  it('registra vía RPC y devuelve el id de la carta', async () => {
    const [{ supabase }, { registerPhysicalCartaForStudent }] = await Promise.all([
      import('../lib/supabase'),
      import('./cartas.service'),
    ]);
    const mutable = supabase as unknown as MutableSupabase;
    const originalRpc = mutable.rpc;
    const originalConsoleError = console.error;
    mutable.rpc = async () => ({ data: 'carta-fisica-1', error: null });
    console.error = () => undefined;
    try {
      const result = await registerPhysicalCartaForStudent({
        studentId: '11111111-1111-4111-8111-111111111111',
        letterType: 'Carta de Compromiso Conductual',
        emissionDate: '2026-08-01',
        observations: 'Registro físico',
      });
      assert.equal(result.ok, true);
      assert.equal(result.cartaId, 'carta-fisica-1');
    } finally {
      mutable.rpc = originalRpc;
      console.error = originalConsoleError;
    }
  });

  it('traduce el error de duplicado 23505 a mensaje amigable', async () => {
    const [{ supabase }, { registerPhysicalCartaForStudent }] = await Promise.all([
      import('../lib/supabase'),
      import('./cartas.service'),
    ]);
    const mutable = supabase as unknown as MutableSupabase;
    const originalRpc = mutable.rpc;
    const originalConsoleError = console.error;
    mutable.rpc = async () => ({
      data: null,
      error: Object.assign(new Error('duplicate'), { code: '23505' }),
    });
    console.error = () => undefined;
    try {
      const result = await registerPhysicalCartaForStudent({
        studentId: '11111111-1111-4111-8111-111111111111',
        letterType: 'Amonestación Escrita',
        emissionDate: '2026-08-01',
      });
      assert.equal(result.ok, false);
      assert.equal(result.message, 'Esta carta física ya está registrada para el mismo año.');
    } finally {
      mutable.rpc = originalRpc;
      console.error = originalConsoleError;
    }
  });
});

describe('fetchCourseCartaRanking', () => {
  it('mapea las filas del RPC a items del ranking', async () => {
    const [{ supabase }, { fetchCourseCartaRanking }] = await Promise.all([
      import('../lib/supabase'),
      import('./cartas.service'),
    ]);
    const mutable = supabase as unknown as MutableSupabase;
    const originalRpc = mutable.rpc;
    const originalConsoleError = console.error;
    mutable.rpc = async () => ({
      data: [
        {
          course_name: '8° Básico A',
          amonestacion_count: 4,
          compromiso_count: 2,
          derivacion_count: 1,
          total_count: 7,
        },
        {
          course_name: '',
          amonestacion_count: 0,
          compromiso_count: 0,
          derivacion_count: 0,
          total_count: 0,
        },
      ],
      error: null,
    });
    console.error = () => undefined;
    try {
      const ranking = await fetchCourseCartaRanking();
      assert.equal(ranking.length, 2);
      assert.equal(ranking[0].course_name, '8° Básico A');
      assert.equal(ranking[0].total_count, 7);
      assert.equal(ranking[1].course_name, 'Sin curso');
    } finally {
      mutable.rpc = originalRpc;
      console.error = originalConsoleError;
    }
  });

  it('propaga el error cuando el RPC no está disponible', async () => {
    const [{ supabase }, { fetchCourseCartaRanking }] = await Promise.all([
      import('../lib/supabase'),
      import('./cartas.service'),
    ]);
    const mutable = supabase as unknown as MutableSupabase;
    const originalRpc = mutable.rpc;
    const originalConsoleError = console.error;
    mutable.rpc = async () => ({ data: null, error: new Error('RPC not found') });
    console.error = () => undefined;
    try {
      await assert.rejects(fetchCourseCartaRanking(), /RPC/);
    } finally {
      mutable.rpc = originalRpc;
      console.error = originalConsoleError;
    }
  });
});

describe('fetchCartaTableStates', () => {
  afterEach(async () => {
    // Restaurado dentro de cada test vía el mock; aquí solo se asegura el orden.
  });

  it('retorna vacío cuando no hay cartas', async () => {
    const install = await installFromMock(() => ({ data: [], error: null }));
    try {
      const { fetchCartaTableStates } = await import('./cartas.service');
      const states = await fetchCartaTableStates();
      assert.deepEqual(states, {});
    } finally {
      install.restore();
    }
  });

  it('retorna vacío cuando hay error de lectura', async () => {
    const install = await installFromMock(() => ({ data: null, error: new Error('boom') }));
    try {
      const { fetchCartaTableStates } = await import('./cartas.service');
      const states = await fetchCartaTableStates();
      assert.deepEqual(states, {});
    } finally {
      install.restore();
    }
  });

  it('agrupa cartas por estudiante y resuelve su estado de tabla', async () => {
    const carta = makeCarta({ id: 'carta-1', student_id: 's-1' });
    const install = await installFromMock((table) => {
      if (table === 'cartas_disciplinarias') return { data: [carta], error: null };
      if (table === 'carta_events') return { data: [], error: null };
      return { data: [], error: null };
    });
    try {
      const { fetchCartaTableStates } = await import('./cartas.service');
      const states = await fetchCartaTableStates();
      assert.ok(states['s-1']);
      assert.equal(typeof states['s-1'].workflowStatus, 'string');
      assert.ok(
        ['pending', 'completed', 'archived', 'none'].includes(states['s-1'].workflowStatus),
      );
    } finally {
      install.restore();
    }
  });
});
