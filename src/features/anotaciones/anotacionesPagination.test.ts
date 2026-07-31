/** @license SPDX-License-Identifier: Apache-2.0 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { ok } from 'node:assert/strict';

const annotationsServicePath = resolve(
  import.meta.dirname!,
  '../../shared/api/services/annotations.service.ts',
);
const viewPath = resolve(import.meta.dirname!, 'AnotacionesView.tsx');
const tablePath = resolve(import.meta.dirname!, 'AnotacionesStudentTable.tsx');

describe('Listado paginado de anotaciones', () => {
  it('carga la nómina desde el RPC en bloques de 25', () => {
    const service = readFileSync(annotationsServicePath, 'utf-8');
    const view = readFileSync(viewPath, 'utf-8');

    ok(service.includes('fetchStudentsWithAnnotationCountsPage'));
    ok(service.includes(".rpc('get_student_annotation_summary')"));
    ok(service.includes('.range(offset, offset + requestedSize)'));
    ok(view.includes('const ANNOTATIONS_PAGE_SIZE = 25'));
    ok(view.includes('fetchStudentsWithAnnotationCountsPage(offset, ANNOTATIONS_PAGE_SIZE)'));
  });

  it('ofrece cargar el siguiente bloque sin reemplazar los estudiantes ya visibles', () => {
    const view = readFileSync(viewPath, 'utf-8');
    const table = readFileSync(tablePath, 'utf-8');

    ok(view.includes('setStudents((current) =>'));
    ok(view.includes('setNextStudentOffset(tableData.nextOffset)'));
    ok(table.includes('Cargar más estudiantes'));
    ok(table.includes('disabled={isLoadingMoreStudents}'));
  });
});
