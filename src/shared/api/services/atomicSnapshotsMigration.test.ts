/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve('supabase/migrations/20260805011211_atomic_causa_related_snapshots.sql'),
  'utf8',
);

describe('atomic snapshot RPC migration', () => {
  it('crea RPCs security invoker con grants explícitos', () => {
    assert.match(migration, /create or replace function public\.save_bitacora_snapshot/);
    assert.match(migration, /create or replace function public\.save_checklist_snapshot/);
    assert.match(migration, /security invoker/);
    assert.match(
      migration,
      /revoke all on function public\.save_bitacora_snapshot\(text, jsonb, jsonb\) from public;/,
    );
    assert.match(
      migration,
      /grant execute on function public\.save_checklist_snapshot\(text, jsonb, jsonb\) to authenticated;/,
    );
  });

  it('usa tenant del JWT y no acepta tenant_id desde el cliente', () => {
    assert.match(migration, /v_tenant_id uuid := public\.current_tenant_id\(\);/);
    assert.doesNotMatch(migration, /p_tenant_id/);
    assert.match(migration, /causa not found or not visible/);
  });
});
