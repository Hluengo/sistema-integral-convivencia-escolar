/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toDateTimeLocalValue, toIsoDateTime } from './annotationEditUtils';

describe('annotationEditUtils', () => {
  it('convierte una fecha ISO a un valor datetime-local válido', () => {
    assert.match(
      toDateTimeLocalValue('2026-07-27T15:45:00.000Z'),
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );
  });

  it('convierte el valor local a ISO', () => {
    assert.match(toIsoDateTime('2026-07-27T12:45'), /^2026-07-27T\d{2}:45:00\.000Z$/);
  });

  it('rechaza una fecha inválida', () => {
    assert.throws(() => toIsoDateTime(''), /Ingresa una fecha y hora válidas/);
  });
});
