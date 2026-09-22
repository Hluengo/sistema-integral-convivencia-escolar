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
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

const FERIADOS_NACIONALES_FIJOS = new Set([
  "01-01",
  "05-01",
  "05-21",
  "06-29",
  "07-16",
  "08-15",
  "09-18",
  "09-19",
  "10-31",
  "11-01",
  "12-08",
  "12-25",
]);

function esFeriadoNacional(fecha: Date): boolean {
  const mesDia = `${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  return FERIADOS_NACIONALES_FIJOS.has(mesDia);
}

/**
 * Calcula días hábiles entre dos fechas (excluye fines de semana)
 */
export function calcularDiasHabiles(
  fechaInicio: string,
  fechaFin: string,
): number {
  const inicio = parseDateOnly(fechaInicio);
  const fin = parseDateOnly(fechaFin);
  let dias = 0;
  const actual = new Date(inicio);

  while (actual <= fin) {
    const diaSemana = actual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6 && !esFeriadoNacional(actual)) {
      dias++;
    }
    actual.setDate(actual.getDate() + 1);
    actual.setHours(0, 0, 0, 0);
  }

  return dias;
}

export function calcularDiasHabilesDesdeDiaSiguiente(
  fechaInicio: string,
  fechaFin: string,
): number {
  const inicio = parseDateOnly(fechaInicio);
  const iniciaEnDiaHabil = inicio.getDay() !== 0 && inicio.getDay() !== 6;
  return Math.max(
    0,
    calcularDiasHabiles(fechaInicio, fechaFin) - (iniciaEnDiaHabil ? 1 : 0),
  );
}

/**
 * Agrega días hábiles a una fecha
 */
export function agregarDiasHabiles(
  fechaInicio: string,
  diasHabiles: number,
): string {
  const fecha = parseDateOnly(fechaInicio);
  let diasAgregados = 0;

  while (diasAgregados < diasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    if (diaSemana !== 0 && diaSemana !== 6 && !esFeriadoNacional(fecha)) {
      diasAgregados++;
    }
  }

  return formatDateOnly(fecha);
}

/**
 * Agrega días corridos (calendario) a una fecha. Se usa para el plazo
 * máximo de investigación de 2 meses (Ley 21809): son 60 días corridos,
 * no hábiles.
 */
export function agregarDiasCorridos(fechaInicio: string, dias: number): string {
  const fecha = parseDateOnly(fechaInicio);
  fecha.setDate(fecha.getDate() + dias);
  return formatDateOnly(fecha);
}

/** Días corridos entre dos fechas, sin contar el día de inicio. */
export function calcularDiasCorridosDesdeDiaSiguiente(
  fechaInicio: string,
  fechaFin: string,
): number {
  const inicio = parseDateOnly(fechaInicio);
  const fin = parseDateOnly(fechaFin);
  return Math.max(
    0,
    Math.round((fin.getTime() - inicio.getTime()) / 86_400_000),
  );
}

function formatDateOnly(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
