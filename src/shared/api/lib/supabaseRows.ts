/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Convierte filas crudas de Supabase a un array tipado de forma segura.
 *
 * El cliente no usa tipos generados del esquema, por lo que `data` llega como
 * `any[]`. Este mapper evita los `as unknown as T[]` esparcidos por los
 * servicios: filtra valores no-objeto y devuelve un array nuevo tipado.
 */
export function toTypedRows<T>(rows: unknown): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is T => typeof row === 'object' && row !== null);
}

/** Convierte una fila única cruda de Supabase a un valor tipado o null. */
export function toTypedRow<T>(row: unknown): T | null {
  if (typeof row !== 'object' || row === null) return null;
  return row as T;
}
