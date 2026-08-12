/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
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
