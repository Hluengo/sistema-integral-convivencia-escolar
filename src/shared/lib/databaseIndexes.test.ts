/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(
  currentDir,
  '../../../supabase/migrations/20260803004959_add_query_pattern_indexes.sql',
);
const migrationSql = readFileSync(migrationPath, 'utf8');

test('migración de índices compuestos es idempotente', () => {
  const createIndexStatements = migrationSql.match(/CREATE INDEX IF NOT EXISTS/gi) ?? [];

  assert.equal(createIndexStatements.length, 16);
  assert.doesNotMatch(migrationSql, /CREATE INDEX(?! IF NOT EXISTS)/i);
});

test('migración cubre patrones frecuentes de lectura por tenant', () => {
  const requiredIndexes = [
    'idx_courses_tenant_position_name',
    'idx_students_tenant_full_name',
    'idx_students_tenant_course_full_name',
    'idx_students_tenant_rut_present',
    'idx_inspectorate_tenant_date_type_student',
    'idx_cartas_tenant_emission_created',
    'idx_cartas_tenant_student_emission_created',
    'idx_carta_events_tenant_student_created',
    'idx_carta_events_tenant_carta_student_type',
    'idx_etapas_tenant_student_transition',
    'idx_disciplinary_files_tenant_student_uploaded',
    'idx_disciplinary_files_tenant_hash_uploaded',
    'idx_disciplinary_annotations_tenant_student_detected',
    'idx_institution_rules_tenant_updated',
    'idx_institution_documents_tenant_uploaded',
    'idx_usage_events_letter_student_created',
  ];

  for (const indexName of requiredIndexes) {
    assert.match(migrationSql, new RegExp(`CREATE INDEX IF NOT EXISTS ${indexName}`));
  }
});
