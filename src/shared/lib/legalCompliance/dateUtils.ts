/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Utilidades de cálculo de fechas hábiles
 */

function parseDateOnly(fecha: string): Date {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

const FERIADOS_NACIONALES_FIJOS = new Set([
  "01-01",
  "05-01",
  "05-21",
  "06-21",
  "07-16",
  "08-15",
  "09-18",
  "09-19",
  "11-01",
  "12-08",
  "12-25",
]);

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function calcularPascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function lunesDeLaSemana(fecha: Date, semanas = 0): Date {
  const lunes = sumarDias(fecha, -(fecha.getDay() || 7) + 1);
  return sumarDias(lunes, semanas * 7);
}

function feriadoTrasladable(
  fecha: Date,
  mes: number,
  dia: number,
): Date | null {
  const original = new Date(fecha.getFullYear(), mes - 1, dia);
  const diaSemana = original.getDay();
  if ((mes === 6 && dia === 29) || (mes === 10 && dia === 12)) {
    if (diaSemana >= 2 && diaSemana <= 4) return lunesDeLaSemana(original);
    if (diaSemana === 5) return lunesDeLaSemana(original, 1);
    return original;
  }
  if (mes === 10 && dia === 31) {
    if (diaSemana === 2) return sumarDias(original, -3);
    if (diaSemana === 3) return sumarDias(original, 2);
    return original;
  }
  return null;
}

/** Feriados nacionales chilenos, incluidos Semana Santa y traslados legales. */
export function esFeriadoNacional(fecha: Date): boolean {
  const mesDia =
    String(fecha.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(fecha.getDate()).padStart(2, "0");
  if (FERIADOS_NACIONALES_FIJOS.has(mesDia)) return true;
  const pascua = calcularPascua(fecha.getFullYear());
  if (
    mismoDia(fecha, sumarDias(pascua, -2)) ||
    mismoDia(fecha, sumarDias(pascua, -1))
  )
    return true;
  return [
    feriadoTrasladable(fecha, 6, 29),
    feriadoTrasladable(fecha, 10, 12),
    feriadoTrasladable(fecha, 10, 31),
  ].some((feriado) => feriado !== null && mismoDia(fecha, feriado));
}

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
    if (diaSemana !== 0 && diaSemana !== 6 && !esFeriadoNacional(actual))
      dias++;
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
  const iniciaEnDiaHabil =
    inicio.getDay() !== 0 &&
    inicio.getDay() !== 6 &&
    !esFeriadoNacional(inicio);
  return Math.max(
    0,
    calcularDiasHabiles(fechaInicio, fechaFin) - (iniciaEnDiaHabil ? 1 : 0),
  );
}

export function agregarDiasHabiles(
  fechaInicio: string,
  diasHabiles: number,
): string {
  const fecha = parseDateOnly(fechaInicio);
  let diasAgregados = 0;
  while (diasAgregados < diasHabiles) {
    fecha.setDate(fecha.getDate() + 1);
    const diaSemana = fecha.getDay();
    if (diaSemana !== 0 && diaSemana !== 6 && !esFeriadoNacional(fecha))
      diasAgregados++;
  }
  return formatDateOnly(fecha);
}

export function agregarDiasCorridos(fechaInicio: string, dias: number): string {
  const fecha = parseDateOnly(fechaInicio);
  fecha.setDate(fecha.getDate() + dias);
  return formatDateOnly(fecha);
}

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
  return year + "-" + month + "-" + day;
}
