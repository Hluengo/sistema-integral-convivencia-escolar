/** @license SPDX-License-Identifier: Apache-2.0 */

import { CHILE_TIME_ZONE } from './dateUtils';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function getValidDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatChileDate(value?: string | null, emptyValue = '—'): string {
  if (!value) return emptyValue;

  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${day}-${month}-${year}`;
  }

  const date = getValidDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatChileDateTime(value?: string | null, emptyValue = '—'): string {
  if (!value) return emptyValue;

  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(value);
  if (dateOnlyMatch) return formatChileDate(value, emptyValue);

  const date = getValidDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
