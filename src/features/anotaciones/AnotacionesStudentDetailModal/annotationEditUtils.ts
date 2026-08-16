/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CHILE_TIME_ZONE } from '../../../shared/lib/dateUtils';

type CivilDateTime = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  year: number;
};

const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const chileDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHILE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function getCivilDateTime(date: Date): CivilDateTime {
  const parts = chileDateTimeFormatter.formatToParts(date);
  const valueByType = new Map(parts.map(({ type, value }) => [type, value]));

  return {
    year: Number(valueByType.get('year')),
    month: Number(valueByType.get('month')),
    day: Number(valueByType.get('day')),
    hour: Number(valueByType.get('hour')),
    minute: Number(valueByType.get('minute')),
  };
}

function toDateTimeLocalString(civilDateTime: CivilDateTime): string {
  const { year, month, day, hour, minute } = civilDateTime;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function parseCivilDateTime(value: string): CivilDateTime | null {
  const match = DATE_TIME_LOCAL_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const civilDateTime = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
  const validationDate = new Date(
    Date.UTC(
      civilDateTime.year,
      civilDateTime.month - 1,
      civilDateTime.day,
      civilDateTime.hour,
      civilDateTime.minute,
    ),
  );

  if (
    validationDate.getUTCFullYear() !== civilDateTime.year ||
    validationDate.getUTCMonth() !== civilDateTime.month - 1 ||
    validationDate.getUTCDate() !== civilDateTime.day ||
    validationDate.getUTCHours() !== civilDateTime.hour ||
    validationDate.getUTCMinutes() !== civilDateTime.minute
  ) {
    return null;
  }

  return civilDateTime;
}

function getChileTimeZoneOffset(date: Date): number {
  const civilDateTime = getCivilDateTime(date);
  return (
    Date.UTC(
      civilDateTime.year,
      civilDateTime.month - 1,
      civilDateTime.day,
      civilDateTime.hour,
      civilDateTime.minute,
    ) - date.getTime()
  );
}

export function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return toDateTimeLocalString(getCivilDateTime(date));
}

export function toIsoDateTime(value: string): string {
  const civilDateTime = parseCivilDateTime(value);
  if (!civilDateTime) {
    throw new Error('Ingresa una fecha y hora válidas.');
  }

  const civilTimestamp = Date.UTC(
    civilDateTime.year,
    civilDateTime.month - 1,
    civilDateTime.day,
    civilDateTime.hour,
    civilDateTime.minute,
  );
  let timestamp = civilTimestamp;

  // El desfase de Chile puede cambiar por horario de verano. Recalculamos una vez
  // con el instante candidato para convertir la hora civil sin depender del servidor.
  timestamp = civilTimestamp - getChileTimeZoneOffset(new Date(timestamp));
  timestamp = civilTimestamp - getChileTimeZoneOffset(new Date(timestamp));

  const date = new Date(timestamp);
  if (toDateTimeLocalString(getCivilDateTime(date)) !== value) {
    throw new Error('Ingresa una fecha y hora válidas.');
  }

  return date.toISOString();
}
