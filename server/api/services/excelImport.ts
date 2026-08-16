/** @license SPDX-License-Identifier: Apache-2.0 */

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import readXlsxFile, { type CellValue } from 'read-excel-file/node';

interface ImportCourseRow {
  name: string;
  level: 'BASICA' | 'MEDIA';
  position: number | null;
}

interface ImportStudentRow {
  full_name: string;
  rut: string;
  course_name: string;
}

export interface ParsedImport {
  courses: ImportCourseRow[];
  students: ImportStudentRow[];
  warnings: string[];
}

const NORMALIZED_LEVELS: Record<string, 'BASICA' | 'MEDIA'> = {
  basica: 'BASICA',
  basico: 'BASICA',
  media: 'MEDIA',
  medio: 'MEDIA',
};

export function normalizeLevel(value: unknown): 'BASICA' | 'MEDIA' {
  if (typeof value === 'string') {
    let key = value.trim().toLowerCase();
    key = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    key = key.replace(/[^a-z]/g, '');
    return NORMALIZED_LEVELS[key] ?? 'BASICA';
  }
  return 'BASICA';
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeRut(value: unknown): string {
  if (!value) return '';
  const raw = typeof value === 'number' ? String(value) : String(value).trim();
  const cleaned = raw.replace(/[^0-9kK-]/g, '').toUpperCase();
  return cleaned.replace(/^-+/, '').replace(/-{2,}/g, '-');
}

function toRow(value: unknown): CellValue[] {
  return Array.isArray(value) ? (value as CellValue[]) : [];
}

function headerIndex(row: CellValue[], candidates: string[]): number {
  return row.findIndex(
    (cell) => typeof cell === 'string' && candidates.some((c) => cell.trim().toLowerCase() === c),
  );
}

/**
 * Parsea un buffer .xlsx en cursos y estudiantes listos para importar.
 *
 * Formato esperado (2 hojas):
 *   - "Cursos": name | level | position
 *   - "Estudiantes": full_name | rut | curso
 *
 * Si solo existe la hoja "Estudiantes", los cursos se derivan de la
 * columna "curso" (la más habitual en exportaciones de colegios).
 */
export async function parseImportWorkbook(
  buffer: Buffer,
  defaultLevel: 'BASICA' | 'MEDIA' = 'BASICA',
): Promise<ParsedImport> {
  const warnings: string[] = [];
  const sheets = (await readXlsxFile(buffer)) as unknown as {
    sheet: string;
    data: CellValue[][];
  }[];

  const findSheet = (candidates: string[]) =>
    sheets.find((sheet) => candidates.includes(sheet.sheet.trim().toLowerCase())) ?? null;

  const coursesSheet = findSheet(['cursos', 'courses']);
  const studentsSheet = findSheet(['estudiantes', 'students', 'alumnos']);

  const courses: ImportCourseRow[] = [];
  const students: ImportStudentRow[] = [];

  // --- Cursos ---
  if (coursesSheet) {
    const rows = coursesSheet.data;
    const header = rows[0] ?? [];
    const iName = headerIndex(header, ['name', 'nombre', 'curso']);
    const iLevel = headerIndex(header, ['level', 'nivel']);
    const iPos = headerIndex(header, ['position', 'posicion', 'orden']);
    for (let r = 1; r < rows.length; r += 1) {
      const row = toRow(rows[r]);
      const name = normalizeText(row[iName] ?? row[0]);
      if (!name) continue;
      const level = iLevel >= 0 ? normalizeLevel(row[iLevel]) : defaultLevel;
      const posRaw = iPos >= 0 ? row[iPos] : null;
      const position = typeof posRaw === 'number' ? posRaw : null;
      courses.push({ name, level, position });
    }
  }

  // --- Estudiantes ---
  if (studentsSheet) {
    const rows = studentsSheet.data;
    const header = rows[0] ?? [];
    const iName = headerIndex(header, ['full_name', 'nombre', 'nombre completo', 'full name']);
    const iRut = headerIndex(header, ['rut', 'run']);
    const iCourse = headerIndex(header, ['curso', 'course', 'course_id']);
    for (let r = 1; r < rows.length; r += 1) {
      const row = toRow(rows[r]);
      const full_name = normalizeText(row[iName] ?? row[0]);
      if (!full_name) continue;
      const rut = iRut >= 0 ? normalizeRut(row[iRut]) : '';
      const course_name = iCourse >= 0 ? normalizeText(row[iCourse]) : '';
      students.push({ full_name, rut, course_name });
    }

    // Derivar cursos si no se proveyó hoja "Cursos".
    if (courses.length === 0) {
      const byName = new Map<string, ImportCourseRow>();
      let pos = 0;
      for (const student of students) {
        const key = student.course_name.toLowerCase();
        if (!key || byName.has(key)) continue;
        pos += 1;
        byName.set(key, { name: student.course_name, level: defaultLevel, position: pos });
      }
      courses.push(...byName.values());
    }
  } else {
    warnings.push('No se encontró la hoja "Estudiantes".');
  }

  return { courses, students, warnings };
}

export interface ImportResult {
  coursesInserted: number;
  studentsInserted: number;
  duplicates: number;
  errors: string[];
}

/**
 * Persiste el árbol cursos → estudiantes (con tenant_id explícito).
 * Usa el servicio (puede ejecutarse fuera de RLS) y deduplica por RUT
 * dentro del lote y contra la base existente.
 */
export async function runImport(
  client: SupabaseClient,
  tenantId: string,
  parsed: ParsedImport,
): Promise<ImportResult> {
  const errors: string[] = [];
  let coursesInserted = 0;
  let studentsInserted = 0;
  let duplicates = 0;

  // 1. Cursos: upsert por (tenant_id, name) para mapear course_id.
  const courseMap = new Map<string, string>();
  // Cursos existentes del tenant.
  const { data: existingCourses, error: cErr } = await client
    .from('courses')
    .select('id,name')
    .eq('tenant_id', tenantId);
  if (cErr) throw cErr;
  for (const c of existingCourses ?? []) {
    courseMap.set((c as { id: string; name: string }).name.toLowerCase(), (c as { id: string }).id);
  }

  const coursesToInsert: Array<{
    id: string;
    name: string;
    level: string;
    position: number | null;
    tenant_id: string;
  }> = [];
  const seenCourseNames = new Set<string>();
  for (const course of parsed.courses) {
    const key = course.name.toLowerCase();
    if (courseMap.has(key) || !seenCourseNames.add(key)) continue;
    const id = randomUUID();
    coursesToInsert.push({
      id,
      name: course.name,
      level: course.level,
      position: course.position,
      tenant_id: tenantId,
    });
    courseMap.set(key, id);
  }
  if (coursesToInsert.length > 0) {
    const { error: insErr } = await client.from('courses').insert(coursesToInsert);
    if (insErr) throw insErr;
    coursesInserted = coursesToInsert.length;
  }

  // 2. Estudiantes: dedupe por RUT dentro del lote y contra existentes.
  const seenRuts = new Set<string>();
  const { data: existingStudents, error: sErr } = await client
    .from('students')
    .select('rut')
    .eq('tenant_id', tenantId)
    .not('rut', 'is', '');
  if (sErr) throw sErr;
  for (const s of existingStudents ?? []) {
    const rut = (s as { rut: string }).rut;
    if (rut) seenRuts.add(rut);
  }

  const studentsToInsert: Array<{
    id: string;
    full_name: string;
    rut: string;
    course_id: string | null;
    tenant_id: string;
  }> = [];
  for (const student of parsed.students) {
    if (student.rut && seenRuts.has(student.rut)) {
      duplicates += 1;
      continue;
    }
    const course_id = student.course_name
      ? (courseMap.get(student.course_name.toLowerCase()) ?? null)
      : null;
    if (student.course_name && !course_id) {
      errors.push(
        `Estudiante "${student.full_name}" referencia curso "${student.course_name}" no encontrado.`,
      );
      continue;
    }
    if (student.rut) seenRuts.add(student.rut);
    studentsToInsert.push({
      id: randomUUID(),
      full_name: student.full_name,
      rut: student.rut,
      course_id,
      tenant_id: tenantId,
    });
  }
  if (studentsToInsert.length > 0) {
    const { error: insErr } = await client.from('students').insert(studentsToInsert);
    if (insErr) throw insErr;
    studentsInserted = studentsToInsert.length;
  }

  return { coursesInserted, studentsInserted, duplicates, errors };
}
