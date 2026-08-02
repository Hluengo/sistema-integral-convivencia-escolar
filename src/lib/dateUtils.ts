/** @license SPDX-License-Identifier: Apache-2.0 */

const CHILE_TIME_ZONE = 'America/Santiago';

export const toDateOnly = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CHILE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const toIsoWithoutMilliseconds = (date: Date): string =>
  date.toISOString().replace('.000Z', 'Z');

export const nowDateOnly = (): string => toDateOnly(new Date());

/**
 * Parses a date-only string (YYYY-MM-DD) at UTC noon so that calendar
 * components (getFullYear, getMonth, getDate) never shift under local
 * America/Santiago DST. Returns NaN if the input is not a valid date.
 */
const parseDateOnlyAtNoonUtc = (value: string): Date => new Date(`${value}T12:00:00Z`);

/** Safe calendar year for a date-only string using the UTC-noon parse. */
export const getYearFromDateOnly = (value: string): number => {
  const parsed = parseDateOnlyAtNoonUtc(value);
  return Number.isNaN(parsed.getTime()) ? NaN : parsed.getUTCFullYear();
};

/** Current school year (calendar year in America/Santiago). */
export const getCurrentSchoolYear = (): number => Number(toDateOnly(new Date()).slice(0, 4));

/** Calendar year of a timestamp/date string in America/Santiago. */
export const getYearInChile = (value: string | Date): number =>
  Number(toDateOnly(value instanceof Date ? value : new Date(value)).slice(0, 4));

export const nowIso = (): string => toIsoWithoutMilliseconds(new Date());

export const daysElapsedCeil = (startDate: string, today: Date = new Date()): number => {
  if (!startDate) {
    return 0;
  }
  const startMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  const todayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toDateOnly(today));
  if (!startMatch || !todayMatch) {
    return 0;
  }

  const startDay = Date.UTC(
    Number(startMatch[1]),
    Number(startMatch[2]) - 1,
    Number(startMatch[3]),
  );
  const currentDay = Date.UTC(
    Number(todayMatch[1]),
    Number(todayMatch[2]) - 1,
    Number(todayMatch[3]),
  );
  const calendarDifference = Math.floor((currentDay - startDay) / (1000 * 60 * 60 * 24));
  return Math.max(0, calendarDifference + 1);
};

export const remainingProcedureDays = (
  startDate: string,
  maxDays: number,
  today: Date = new Date(),
): number => maxDays - daysElapsedCeil(startDate, today);
