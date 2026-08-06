/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ReportHistoryItem, ReportFilters } from './reports.service';

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
  order(_column: string, _opts?: { ascending?: boolean }) {
    return this;
  }
  limit(_n: number) {
    return this;
  }
  insert(_row: Record<string, unknown>) {
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
}

async function withFromMock(
  resultForTable: (table: string) => { data: unknown; error: Error | null },
  fn: () => Promise<unknown>,
): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.from;
  const originalConsoleError = console.error;
  mutable.from = (table) => new MockQueryBuilder(table, resultForTable(table) as never);
  console.error = () => undefined;
  try {
    return await fn();
  } finally {
    mutable.from = originalFrom;
    console.error = originalConsoleError;
  }
}

function makeHistoryItem(overrides: Partial<ReportHistoryItem> = {}): ReportHistoryItem {
  return {
    id: 'rpt-1',
    created_by: 'user-1',
    report_type: 'expedientes',
    status: 'completed',
    filters: { course: '8° Básico A', fromDate: '', toDate: '', status: '', responsible: '' },
    row_count: 12,
    file_name: 'reporte.xlsx',
    created_at: '2026-08-01T12:00:00.000Z',
    completed_at: '2026-08-01T12:05:00.000Z',
    ...overrides,
  };
}

describe('fetchReportHistory', () => {
  it('mapea las filas y completa filtros vacíos con defaults', async () => {
    const result = await withFromMock(
      () => ({
        data: [
          makeHistoryItem({
            id: 'rpt-1',
            filters: {
              course: '8° Básico A',
              fromDate: '2026-03-01',
              toDate: '2026-08-01',
              status: '',
              responsible: '',
            },
          }),
          makeHistoryItem({
            id: 'rpt-2',
            filters: undefined as unknown as ReportFilters,
          }),
        ],
        error: null,
      }),
      async () => {
        const { fetchReportHistory } = await import('./reports.service');
        return fetchReportHistory();
      },
    );
    const items = result as ReportHistoryItem[];
    assert.equal(items.length, 2);
    assert.equal(items[0].filters.course, '8° Básico A');
    // Los filtros vacíos se completan con EMPTY_FILTERS
    assert.equal(items[1].filters.fromDate, '');
    assert.equal(items[1].filters.toDate, '');
    assert.equal(items[1].filters.responsible, '');
  });

  it('retorna vacío cuando no hay historial', async () => {
    const result = await withFromMock(
      () => ({ data: [], error: null }),
      async () => {
        const { fetchReportHistory } = await import('./reports.service');
        return fetchReportHistory();
      },
    );
    assert.deepEqual(result, []);
  });

  it('propaga el error de lectura', async () => {
    await assert.rejects(
      withFromMock(
        () => ({ data: null, error: new Error('db down') }),
        async () => {
          const { fetchReportHistory } = await import('./reports.service');
          return fetchReportHistory();
        },
      ),
      /db down/,
    );
  });
});

describe('createReportHistory', () => {
  it('inserta el registro de reporte', async () => {
    const result = await withFromMock(
      () => ({ data: null, error: null }),
      async () => {
        const { createReportHistory } = await import('./reports.service');
        return createReportHistory({
          reportType: 'anotaciones',
          filters: { course: '', fromDate: '', toDate: '', status: '', responsible: '' },
          rowCount: 5,
          fileName: 'anotaciones.xlsx',
        });
      },
    );
    assert.equal(result, undefined);
  });

  it('propaga el error de inserción', async () => {
    await assert.rejects(
      withFromMock(
        () => ({ data: null, error: new Error('insert denied') }),
        async () => {
          const { createReportHistory } = await import('./reports.service');
          return createReportHistory({
            reportType: 'uso',
            filters: { course: '', fromDate: '', toDate: '', status: '', responsible: '' },
            rowCount: 0,
            fileName: 'uso.xlsx',
          });
        },
      ),
      /insert denied/,
    );
  });
});
