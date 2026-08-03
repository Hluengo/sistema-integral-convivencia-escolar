/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const seedPath = resolve(currentDir, '../../../supabase/seed.sql');
const seedSql = readFileSync(seedPath, 'utf8');

test('seed local cubre datos operativos principales', () => {
  const requiredTables = [
    'public.tenants',
    'auth.users',
    'auth.identities',
    'public.applications',
    'public.profiles',
    'public.app_memberships',
    'public.courses',
    'public.students',
    'public.inspectorate_records',
    'public.causas',
    'public.bitacora_entries',
    'public.checklist_items',
    'public.cartas_disciplinarias',
    'public.carta_events',
    'public.etapas_disciplinarias',
    'public.disciplinary_rules',
    'public.document_templates',
    'public.disciplinary_processes',
    'public.disciplinary_process_files',
    'public.disciplinary_annotations_detected',
    'public.document_analyses',
    'public.student_history_entries',
    'public.notifications',
    'public.report_history',
    'public.institution_settings',
    'public.institution_rule_versions',
    'public.institution_documents',
    'public.membership_invitations',
    'public.audit_events',
  ];

  for (const table of requiredTables) {
    assert.match(seedSql, new RegExp(`INSERT INTO ${table.replace('.', '\\.')}`));
  }
});

test('seed local es idempotente y no usa cuentas productivas', () => {
  assert.doesNotMatch(seedSql, /Seed file placeholder/);
  assert.match(seedSql, /ON CONFLICT/);
  assert.match(seedSql, /example\.local/);
  assert.doesNotMatch(seedSql, /usuario@colegio\.cl|superusuario@colegio\.cl/);
});
