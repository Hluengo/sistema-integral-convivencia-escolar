/** @license SPDX-License-Identifier: Apache-2.0 */

import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import writeExcelFile from "write-excel-file/node";
import { parseTeachersWorkbook, importTeachers } from "./teachersImport.ts";

async function workbook(rows: Array<Array<{ value: string | number }>>) {
  return await writeExcelFile([{ sheet: "Profesores", data: rows }]).toBuffer();
}

const HEADER = [[{ value: "full_name" }]];

// ============================================================
// parseTeachersWorkbook
// ============================================================
test("parseTeachersWorkbook lee la hoja Profesores y omite vacías", async () => {
  const buffer = await workbook([
    ...HEADER,
    [{ value: "  Ana Pérez  " }],
    [{ value: "" }],
    [{ value: "Luis Soto" }],
  ]);
  const parsed = await parseTeachersWorkbook(buffer);
  assert.deepEqual(parsed.names, ["Ana Pérez", "Luis Soto"]);
  assert.equal(parsed.emptyRows, 1);
});

test("parseTeachersWorkbook exige la columna full_name", async () => {
  const buffer = await workbook([[{ value: "nombre_otro" }], [{ value: "X" }]]);
  await assert.rejects(parseTeachersWorkbook(buffer), /full_name/);
});

// ============================================================
// importTeachers (cliente mock)
// ============================================================
interface MockClientOptions {
  existing?: string[];
  insertError?: unknown;
}

function makeMockClient(opts: MockClientOptions): {
  client: SupabaseClient;
  inserted: Array<Record<string, unknown>>;
} {
  const inserted: Array<Record<string, unknown>> = [];
  const mock: unknown = {
    from(table: string) {
      if (table !== "teachers") throw new Error(`tabla inesperada: ${table}`);
      return {
        select: () => ({
          eq: async () => ({
            data: (opts.existing ?? []).map((full_name) => ({ full_name })),
            error: null,
          }),
        }),
        insert: async (rows: Array<Record<string, unknown>>) => {
          inserted.push(...rows);
          return { error: opts.insertError ?? null };
        },
      };
    },
  };
  return { client: mock as SupabaseClient, inserted };
}

test("importTeachers inserta nuevos y omite existentes normalizados", async () => {
  const buffer = await workbook([
    ...HEADER,
    [{ value: "Ana Pérez" }],
    [{ value: "ana perez" }],
    [{ value: "Luis Soto" }],
  ]);
  const { client, inserted } = makeMockClient({ existing: ["LUIS SOTO"] });
  const result = await importTeachers(client, "tenant-1", {
    buffer,
    originalname: "profesores.xlsx",
  });
  assert.equal(result.rows, 3);
  assert.equal(result.inserted, 1);
  assert.equal(result.skippedExisting, 1);
  assert.equal(result.rosterSize, 2);
  assert.deepEqual(result.errors, []);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].tenant_id, "tenant-1");
  assert.equal(inserted[0].full_name, "Ana Pérez");
});

test("importTeachers reporta error de inserción sin contar altas", async () => {
  const buffer = await workbook([...HEADER, [{ value: "Ana Pérez" }]]);
  const { client } = makeMockClient({ insertError: new Error("falla db") });
  const result = await importTeachers(client, "tenant-1", {
    buffer,
    originalname: "profesores.xlsx",
  });
  assert.equal(result.inserted, 0);
  assert.equal(result.errors.length, 1);
});
