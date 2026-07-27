/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function toIsoDateTime(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error('Ingresa una fecha y hora válidas.');
  }
  return date.toISOString();
}
