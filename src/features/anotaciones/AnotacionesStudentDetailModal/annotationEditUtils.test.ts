/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { toDateTimeLocalValue, toIsoDateTime } from './annotationEditUtils';

describe('annotationEditUtils', () => {
  it('convierte una fecha ISO a un valor datetime-local válido', () => {
    expect(toDateTimeLocalValue('2026-07-27T15:45:00.000Z')).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );
  });

  it('convierte el valor local a ISO', () => {
    expect(toIsoDateTime('2026-07-27T12:45')).toMatch(/^2026-07-27T\d{2}:45:00\.000Z$/);
  });

  it('rechaza una fecha inválida', () => {
    expect(() => toIsoDateTime('')).toThrow('Ingresa una fecha y hora válidas.');
  });
});
