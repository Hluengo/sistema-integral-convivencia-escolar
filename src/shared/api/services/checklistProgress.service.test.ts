/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

const VALID_CAUSA_ID = '00000000-0000-4000-8000-000000000001';
const VALID_ITEM_ID = 'chk_rec_1';

class MockQueryBuilder<T> {
  insertedRow: Record<string, unknown> | null = null;

  constructor(private readonly result: { data: T | null; error: Error | null }) {}

  select() {
    return this;
  }

  eq() {
    return this;
  }

  order() {
    return this;
  }

  insert(row: Record<string, unknown>) {
    this.insertedRow = row;
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

async function withProgressMock<T>(
  result: { data: T | null; error: Error | null },
  fn: (query: MockQueryBuilder<T>) => Promise<unknown>,
): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as {
    from: (table: string) => MockQueryBuilder<T>;
  };
  const originalFrom = mutable.from;
  const query = new MockQueryBuilder(result);
  mutable.from = () => query;
  try {
    return await fn(query);
  } finally {
    mutable.from = originalFrom;
  }
}
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/20260812165845_add_checklist_progress_entries.sql',
);

describe('checklist_progress_entries migration', () => {
  it('mantiene tenant, FK compuesta, RLS y no expone anon', () => {
    const migration = readFileSync(migrationPath, 'utf8');
    assert.match(migration, /tenant_id uuid not null/);
    assert.match(migration, /foreign key \(checklist_item_id, causa_id\)/);
    assert.match(migration, /enable row level security/);
    assert.match(migration, /revoke all on table public\.checklist_progress_entries from anon/);
    assert.match(
      migration,
      /grant select, insert, update, delete on table public\.checklist_progress_entries to authenticated/,
    );
  });
});

describe('checklist progress service', () => {
  it('mapea la fecha y conserva la asociación con el hito', async () => {
    const occurredAt = '2026-08-12T14:30:00.000Z';
    const result = await withProgressMock(
      {
        data: {
          id: 'progress-1',
          causa_id: VALID_CAUSA_ID,
          checklist_item_id: VALID_ITEM_ID,
          title: 'Entrevista con apoderado',
          description: 'Se registra la entrevista y sus acuerdos.',
          entry_type: 'Entrevista',
          occurred_at: occurredAt,
          document_name: null,
          document_url: null,
          created_by: null,
          created_at: occurredAt,
          invalidated_at: null,
          invalidated_by: null,
          invalidation_reason: null,
        },
        error: null,
      },
      async (query) => {
        const { createChecklistProgress } = await import('./checklistProgress.service');
        const created = await createChecklistProgress({
          causaId: VALID_CAUSA_ID,
          checklistItemId: VALID_ITEM_ID,
          title: ' Entrevista con apoderado ',
          description: ' Se registra la entrevista y sus acuerdos. ',
          entryType: 'Entrevista',
          occurredAt,
        });
        assert.equal(query.insertedRow?.causa_id, VALID_CAUSA_ID);
        assert.equal(query.insertedRow?.checklist_item_id, VALID_ITEM_ID);
        assert.equal(query.insertedRow?.occurred_at, occurredAt);
        return created;
      },
    );

    assert.equal((result as { occurredAt: string }).occurredAt, occurredAt);
  });

  it('devuelve los avances ordenados por fecha y descarta filas inválidas', async () => {
    const occurredAt = '2026-08-12T14:30:00.000Z';
    const result = await withProgressMock(
      {
        data: [
          {
            id: 'progress-1',
            causa_id: VALID_CAUSA_ID,
            checklist_item_id: VALID_ITEM_ID,
            title: 'Avance válido',
            description: 'Descripción válida.',
            entry_type: 'Evidencia',
            occurred_at: occurredAt,
            document_name: null,
            document_url: null,
            created_by: null,
            created_at: occurredAt,
            invalidated_at: null,
            invalidated_by: null,
            invalidation_reason: null,
          },
          { id: 'invalid-row' },
        ],
        error: null,
      },
      async () => {
        const { fetchChecklistProgress } = await import('./checklistProgress.service');
        return fetchChecklistProgress(VALID_CAUSA_ID);
      },
    );

    assert.equal((result as unknown[]).length, 1);
    assert.equal((result as [{ checklistItemId: string }])[0].checklistItemId, VALID_ITEM_ID);
  });
});
