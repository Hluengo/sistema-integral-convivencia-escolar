/** @license SPDX-License-Identifier: Apache-2.0 */

/** Tope de filas por respuesta de PostgREST: toda consulta corta acá. */
const PAGE_SIZE = 1000;

/**
 * Trae todas las filas paginando con `range`. PostgREST devuelve como máximo
 * 1000 filas por respuesta, así que una lectura sin paginar deja datos fuera
 * en silencio (dedupe incompleto, conteos mutilados).
 */
export async function fetchAllRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}
