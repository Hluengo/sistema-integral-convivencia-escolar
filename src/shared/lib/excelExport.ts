/** @license SPDX-License-Identifier: Apache-2.0 */

import type { SheetData } from "write-excel-file/browser";

/** Descarga un libro multi-hoja. Import perezoso: no suma al bundle inicial. */
export async function exportExcelWorkbook(
  sheets: { sheet?: string; data: SheetData }[],
  fileName: string,
): Promise<void> {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(sheets).toFile(fileName);
}

/** Plantilla base (Cursos + Estudiantes + Profesores) para carga masiva. */
export async function downloadBaseTemplate(): Promise<void> {
  const cursos = [
    [{ value: "name" }, { value: "level" }, { value: "position" }],
  ];
  const estudiantes = [
    [{ value: "full_name" }, { value: "rut" }, { value: "curso" }],
  ];
  const profesores = [[{ value: "full_name" }]];
  await exportExcelWorkbook(
    [
      { sheet: "Cursos", data: cursos },
      { sheet: "Estudiantes", data: estudiantes },
      { sheet: "Profesores", data: profesores },
    ],
    "plantilla-base-colegio.xlsx",
  );
}
