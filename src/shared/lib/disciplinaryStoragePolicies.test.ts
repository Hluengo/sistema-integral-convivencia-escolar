/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(
  resolve(
    currentDir,
    '../../../supabase/migrations/20260803165731_align_disciplinary_storage_roles.sql',
  ),
  'utf8',
);
const middlewareSource = readFileSync(
  resolve(currentDir, '../../../server/middleware/requireMembership.ts'),
  'utf8',
);

const roleListMatch = middlewareSource.match(
  /const CONVIVENCIA_MEMBERSHIP_ROLES = \[([\s\S]*?)\] as const;/,
);
const convivenciaRoles =
  roleListMatch?.[1].match(/'([^']+)'/g)?.map((role) => role.replaceAll("'", '')) ?? [];

test('políticas Storage de procesos disciplinarios reflejan roles del middleware', () => {
  assert.ok(convivenciaRoles.length > 0, 'No se encontraron roles del middleware');

  for (const role of convivenciaRoles) {
    assert.match(migrationSql, new RegExp(`'${role}'`));
  }
});

test('políticas Storage de procesos disciplinarios mantienen aislamiento por tenant', () => {
  assert.match(migrationSql, /bucket_id = 'disciplinary-processes'/);
  assert.match(migrationSql, /to authenticated/);
  assert.match(migrationSql, /m\.application_code = 'convivencia'/);
  assert.match(migrationSql, /m\.is_active/);
  assert.match(migrationSql, /m\.tenant_id::text = \(storage\.foldername\(name\)\)\[1\]/);
});
