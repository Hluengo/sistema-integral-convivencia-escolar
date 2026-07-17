/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Utilidades de cálculo de fechas hábiles
 */

/**
 * Calcula días hábiles entre dos fechas (excluye fines de semana)
 */
export function calcularDiasHabiles(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  let dias = 0;
  const actual = new Date(inicio);

  while (actual <= fin) {
    const diaSemana = actual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      dias++;
    }
    actual.setDate(actual.getDate() + 1);
  }

  return dias;
}

/**
 * Agrega días hábiles a una fecha
 */
export function agregarDiasHabiles(fechaInicio: string, diasHabiles: number): string {
  const fecha = new Date(fechaInicio);
  let diasAgregados = 0;

  while (diasAgregados < diasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasAgregados++;
    }
  }

  return fecha.toISOString().split('T')[0];
}