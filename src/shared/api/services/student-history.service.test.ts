/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { StudentHistoryEntry } from './student-history.service';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

const VALID_UUID = '00000000-0000-4000-8000-000000000001';

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
  limit(_n: number) {
    return this;
  }
  insert(_row: Record<string, unknown>) {
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
}

async function withHistoryMocks(options: {
  resultForTable: (table: string) => { data: unknown; error: Error | null };
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.from;
  mutable.from = (table) => new MockQueryBuilder(table, options.resultForTable(table) as never);
  try {
    return await options.fn();
  } finally {
    mutable.from = originalFrom;
  }
}

function makeEntry(overrides: Partial<StudentHistoryEntry> = {}): StudentHistoryEntry {
  return {
    id: 'h-1',
    student_id: VALID_UUID,
    title: 'Compromiso firmado',
    description: 'El estudiante firmó un compromiso.',
    created_by: 'user-1',
    created_at: '2026-08-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('fetchStudentHistoryEntries', () => {
  it('consulta por estudiante y devuelve las entradas ordenadas', async () => {
    const result = await withHistoryMocks({
      resultForTable: () => ({ data: [makeEntry(), makeEntry({ id: 'h-2' })], error: null }),
      fn: async () => {
        const { fetchStudentHistoryEntries } = await import('./student-history.service');
        return fetchStudentHistoryEntries(VALID_UUID);
      },
    });
    assert.equal((result as StudentHistoryEntry[]).length, 2);
    assert.equal((result as StudentHistoryEntry[])[0].student_id, VALID_UUID);
  });

  it('retorna lista vacía cuando el studentId no es un UUID válido', async () => {
    const result = await withHistoryMocks({
      resultForTable: () => ({ data: [], error: null }),
      fn: async () => {
        const { fetchStudentHistoryEntries } = await import('./student-history.service');
        return fetchStudentHistoryEntries('no-es-uuid');
      },
    });
    assert.deepEqual(result, []);
  });

  it('lanza error cuando la consulta falla', async () => {
    await assert.rejects(
      withHistoryMocks({
        resultForTable: () => ({ data: null, error: new Error('db down') }),
        fn: async () => {
          const { fetchStudentHistoryEntries } = await import('./student-history.service');
          return fetchStudentHistoryEntries(VALID_UUID);
        },
      }),
      /No se pudo cargar el historial manual/,
    );
  });
});

describe('createStudentHistoryEntry', () => {
  const input = {
    studentId: VALID_UUID,
    title: 'Nueva entrada',
    description: 'Registro manual del apoderado.',
  };

  it('inserta la entrada y devuelve la fila creada', async () => {
    const result = await withHistoryMocks({
      resultForTable: () => ({ data: makeEntry({ title: 'Nueva entrada' }), error: null }),
      fn: async () => {
        const { createStudentHistoryEntry } = await import('./student-history.service');
        return createStudentHistoryEntry(input);
      },
    });
    assert.equal((result as StudentHistoryEntry).title, 'Nueva entrada');
  });

  it('lanza error cuando falla la inserción', async () => {
    await assert.rejects(
      withHistoryMocks({
        resultForTable: () => ({ data: null, error: new Error('insert denied') }),
        fn: async () => {
          const { createStudentHistoryEntry } = await import('./student-history.service');
          return createStudentHistoryEntry(input);
        },
      }),
      /No se pudo guardar la entrada/,
    );
  });

  it('rechaza input inválido por Zod antes de consultar', async () => {
    await assert.rejects(
      withHistoryMocks({
        resultForTable: () => ({ data: null, error: null }),
        fn: async () => {
          const { createStudentHistoryEntry } = await import('./student-history.service');
          return createStudentHistoryEntry({ ...input, title: 'ab' });
        },
      }),
      /al menos 3 caracteres/,
    );
  });
});
