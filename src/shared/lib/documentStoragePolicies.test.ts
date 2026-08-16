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
    '../../../supabase/migrations/20260805170822_align_convivencia_document_storage_roles.sql',
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

test('políticas Storage de documentos de convivencia reflejan roles del middleware', () => {
  assert.ok(convivenciaRoles.length > 0, 'No se encontraron roles del middleware');

  for (const role of convivenciaRoles) {
    assert.match(migrationSql, new RegExp(`'${role}'`));
  }
});

test('políticas Storage de documentos de convivencia mantienen causa y carpeta documentos', () => {
  assert.match(migrationSql, /bucket_id = 'documentos_convivencia'/);
  assert.match(migrationSql, /to authenticated/);
  assert.match(migrationSql, /\(storage\.foldername\(name\)\)\[2\] = 'documentos'/);
  assert.match(migrationSql, /from public\.causas c/);
  assert.match(migrationSql, /where c\.id = \(storage\.foldername\(name\)\)\[1\]/);
  assert.match(migrationSql, /m\.application_code = 'convivencia'/);
  assert.match(migrationSql, /m\.is_active/);
});
