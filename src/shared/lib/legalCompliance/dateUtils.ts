/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Utilidades de cálculo de fechas hábiles
 */

/**
 * Parsea 'YYYY-MM-DD' como fecha local (no UTC). `new Date('YYYY-MM-DD')`
 * se interpreta como UTC y luego getDay()/setDate() operan en hora local,
 * desplazando el día en zonas no-UTC (p. ej. America/Santiago, UTC-3/-4).
 */
function parseDateOnly(fecha: string): Date {
  const [year, month, day] = fecha.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/**
 * Calcula días hábiles entre dos fechas (excluye fines de semana)
 */
export function calcularDiasHabiles(fechaInicio: string, fechaFin: string): number {
  const inicio = parseDateOnly(fechaInicio);
  const fin = parseDateOnly(fechaFin);
  let dias = 0;
  const actual = new Date(inicio);

  while (actual <= fin) {
    const diaSemana = actual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      dias++;
    }
    actual.setDate(actual.getDate() + 1);
    actual.setHours(0, 0, 0, 0);
  }

  return dias;
}

/**
 * Agrega días hábiles a una fecha
 */
export function agregarDiasHabiles(fechaInicio: string, diasHabiles: number): string {
  const fecha = parseDateOnly(fechaInicio);
  let diasAgregados = 0;

  while (diasAgregados < diasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasAgregados++;
    }
  }

  return formatDateOnly(fecha);
}

function formatDateOnly(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
