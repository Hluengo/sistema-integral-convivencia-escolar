/** @license SPDX-License-Identifier: Apache-2.0 */
import readXlsxFile, { type CellValue } from "read-excel-file/node";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bulkNameKey } from "../../lib/bulkDisciplinaryPdf.js";

export interface ParsedTeachers {
  names: string[];
  emptyRows: number;
  warnings: string[];
}

export interface TeacherImportResult {
  fileName: string;
  rows: number;
  inserted: number;
  skippedExisting: number;
  emptyRows: number;
  rosterSize: number;
  errors: string[];
}

function normalizeText(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFC").replace(/\s+/g, " ").trim()
    : "";
}

function headerIndex(row: CellValue[], candidates: string[]): number {
  return row.findIndex(
    (cell) =>
      typeof cell === "string" &&
      candidates.some((c) => cell.trim().toLowerCase() === c),
  );
}

/**
 * Parsea un buffer .xlsx con la nómina docente lista para importar.
 *
 * Formato esperado (hoja "Profesores"):
 *   - "Profesores": full_name
 */
export async function parseTeachersWorkbook(
  buffer: Buffer,
): Promise<ParsedTeachers> {
  const warnings: string[] = [];
  const sheets = (await readXlsxFile(buffer)) as unknown as {
    sheet: string;
    data: CellValue[][];
  }[];
  const sheet =
    sheets.find((entry) =>
      ["profesores", "teachers", "docentes", "profesor"].includes(
        entry.sheet.trim().toLowerCase(),
      ),
    ) ??
    sheets[0] ??
    null;
  if (!sheet) throw new Error("El archivo no contiene hojas.");
  if (sheet.data.length === 0) {
    throw new Error("La hoja de profesores está vacía.");
  }
  const nameIndex = headerIndex(sheet.data[0] ?? [], [
    "full_name",
    "nombre",
    "nombre completo",
    "docente",
    "profesor",
    "teacher",
    "name",
  ]);
  if (nameIndex === -1) {
    throw new Error("Incluya la columna «full_name» en la hoja de profesores.");
  }
  const names: string[] = [];
  let emptyRows = 0;
  for (const row of sheet.data.slice(1)) {
    const name = normalizeText(row[nameIndex]);
    if (!name) {
      emptyRows += 1;
      continue;
    }
    names.push(name);
  }
  return { names, emptyRows, warnings };
}

export async function importTeachers(
  client: SupabaseClient,
  tenantId: string,
  file: { buffer: Buffer; originalname: string },
): Promise<TeacherImportResult> {
  const parsed = await parseTeachersWorkbook(file.buffer);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of parsed.names) {
    const key = bulkNameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  const { data: existing, error: existingError } = await client
    .from("teachers")
    .select("full_name")
    .eq("tenant_id", tenantId);
  if (existingError) throw existingError;
  const existingKeys = new Set(
    ((existing ?? []) as Array<{ full_name: string }>).map((row) =>
      bulkNameKey(row.full_name),
    ),
  );
  const fresh = unique.filter((name) => !existingKeys.has(bulkNameKey(name)));
  const errors: string[] = [];
  let inserted = 0;
  if (fresh.length > 0) {
    const { error: insertError } = await client
      .from("teachers")
      .insert(fresh.map((full_name) => ({ tenant_id: tenantId, full_name })));
    if (insertError) {
      errors.push(
        insertError instanceof Error
          ? insertError.message
          : "No fue posible guardar la nómina.",
      );
    } else {
      inserted = fresh.length;
    }
  }
  return {
    fileName: file.originalname,
    rows: parsed.names.length,
    inserted,
    skippedExisting: unique.length - fresh.length,
    emptyRows: parsed.emptyRows,
    rosterSize: (existing ?? []).length + inserted,
    errors,
  };
}
