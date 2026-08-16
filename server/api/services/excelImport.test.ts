/** @license SPDX-License-Identifier: Apache-2.0 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import writeExcelFile from 'write-excel-file/node';
import {
  normalizeLevel,
  normalizeRut,
  parseImportWorkbook,
  runImport,
  type ParsedImport,
} from './excelImport.ts';

// ============================================================
// normalizeLevel
// ============================================================
test('normalizeLevel normaliza niveles con acentos y variantes', () => {
  assert.equal(normalizeLevel('Básica'), 'BASICA');
  assert.equal(normalizeLevel('básico'), 'BASICA');
  assert.equal(normalizeLevel('Media'), 'MEDIA');
  assert.equal(normalizeLevel('MEDIO'), 'MEDIA');
  assert.equal(normalizeLevel(''), 'BASICA');
  assert.equal(normalizeLevel(null), 'BASICA');
  assert.equal(normalizeLevel('Desconocido'), 'BASICA');
});

// ============================================================
// normalizeRut
// ============================================================
test('normalizeRut limpia y mayusculiza el RUT', () => {
  assert.equal(normalizeRut('12.345.678-9'), '12345678-9');
  assert.equal(normalizeRut('  9.876.543-k  '), '9876543-K');
  assert.equal(normalizeRut(12345678), '12345678');
  assert.equal(normalizeRut('abc-12.345.678-9'), '12345678-9');
  assert.equal(normalizeRut(''), '');
});

// ============================================================
// parseImportWorkbook (con fixture .xlsx real)
// ============================================================
test('parseImportWorkbook lee dos hojas y normaliza niveles', async () => {
  const cursos = [
    [{ value: 'name' }, { value: 'level' }, { value: 'position' }],
    [{ value: '1° Básico' }, { value: 'Básica' }, { value: 1 }],
    [{ value: '2° Medio' }, { value: 'Media' }, { value: 2 }],
  ];
  const estudiantes = [
    [{ value: 'full_name' }, { value: 'rut' }, { value: 'curso' }],
    [{ value: 'Juan Pérez' }, { value: '12.345.678-9' }, { value: '1° Básico' }],
    [{ value: 'María Gómez' }, { value: '9.876.543-k' }, { value: '2° Medio' }],
  ];
  const buffer = await writeExcelFile([
    { sheet: 'Cursos', data: cursos },
    { sheet: 'Estudiantes', data: estudiantes },
  ]).toBuffer();

  const parsed = await parseImportWorkbook(buffer);

  assert.equal(parsed.courses.length, 2);
  assert.equal(parsed.courses[0].name, '1° Básico');
  assert.equal(parsed.courses[0].level, 'BASICA');
  assert.equal(parsed.courses[1].level, 'MEDIA');
  assert.equal(parsed.courses[1].position, 2);
  assert.equal(parsed.students.length, 2);
  assert.equal(parsed.students[0].full_name, 'Juan Pérez');
  assert.equal(parsed.students[0].rut, '12345678-9');
  assert.equal(parsed.students[0].course_name, '1° Básico');
  assert.equal(parsed.students[1].rut, '9876543-K');
});

// ============================================================
// parseImportWorkbook deriva cursos si solo hay hoja Estudiantes
// ============================================================
test('parseImportWorkbook deriva cursos desde la hoja Estudiantes', async () => {
  const estudiantes = [
    [{ value: 'full_name' }, { value: 'rut' }, { value: 'curso' }],
    [{ value: 'Ana' }, { value: '11.111.111-1' }, { value: '3° Básico' }],
    [{ value: 'Luis' }, { value: '22.222.222-2' }, { value: '3° Básico' }],
    [{ value: 'Eva' }, { value: '33.333.333-3' }, { value: '4° Básico' }],
  ];
  const buffer = await writeExcelFile([{ sheet: 'Estudiantes', data: estudiantes }]).toBuffer();

  const parsed = await parseImportWorkbook(buffer, 'BASICA');

  assert.equal(parsed.courses.length, 2);
  assert.equal(parsed.courses[0].name, '3° Básico');
  assert.equal(parsed.courses[1].name, '4° Básico');
  assert.equal(parsed.students.length, 3);
});

// ============================================================
// runImport deduplica por RUT y mapea course_id
// ============================================================
interface MockCourse {
  id: string;
  name: string;
}
interface MockStudent {
  rut: string;
}
interface MockClientOptions {
  existingCourses?: MockCourse[];
  existingStudents?: MockStudent[];
  insertError?: unknown;
}

function makeMockClient(opts: MockClientOptions): SupabaseClient {
  const existingCourses = opts.existingCourses ?? [];
  const existingStudents = opts.existingStudents ?? [];
  const mock: unknown = {
    from(table: string) {
      if (table === 'courses') {
        return {
          select: () => ({
            eq: async () => ({ data: existingCourses, error: null }),
          }),
          insert: async () => ({ error: opts.insertError ?? null }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            not: async () => ({ data: existingStudents, error: null }),
          }),
        }),
        insert: async () => ({ error: opts.insertError ?? null }),
      };
    },
  };
  return mock as SupabaseClient;
}

test('runImport inserta cursos, mapea course_id y deduplica por RUT', async () => {
  const parsed: ParsedImport = {
    courses: [
      { name: '1° Básico', level: 'BASICA', position: 1 },
      { name: '2° Medio', level: 'MEDIA', position: 2 },
    ],
    students: [
      { full_name: 'Juan', rut: '12345678-9', course_name: '1° Básico' },
      { full_name: 'María', rut: '12345678-9', course_name: '2° Medio' },
      { full_name: 'Eva', rut: '33333333-3', course_name: '2° Medio' },
      { full_name: 'Sin Curso', rut: '44444444-4', course_name: 'Inexistente' },
    ],
    warnings: [],
  };
  const client = makeMockClient({ existingCourses: [], existingStudents: [] });

  const result = await runImport(client, 'tenant-1', parsed);

  assert.equal(result.coursesInserted, 2);
  assert.equal(result.studentsInserted, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /Sin Curso/);
});

test('runImport respeta RUTs ya existentes en la base', async () => {
  const parsed: ParsedImport = {
    courses: [{ name: '1° Básico', level: 'BASICA', position: 1 }],
    students: [{ full_name: 'Juan', rut: '12345678-9', course_name: '1° Básico' }],
    warnings: [],
  };
  const client = makeMockClient({
    existingCourses: [{ id: 'course-1', name: '1° Básico' }],
    existingStudents: [{ rut: '12345678-9' }],
  });

  const result = await runImport(client, 'tenant-1', parsed);

  assert.equal(result.coursesInserted, 0);
  assert.equal(result.studentsInserted, 0);
  assert.equal(result.duplicates, 1);
  assert.equal(result.errors.length, 0);
});
