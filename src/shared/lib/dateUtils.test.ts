import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  daysElapsedCeil,
  remainingProcedureDays,
  toDateOnly,
  toIsoWithoutMilliseconds,
} from './dateUtils';

describe('dateUtils', () => {
  it('formats date-only and ISO strings consistently', () => {
    const date = new Date('2026-07-08T12:34:56.000Z');
    assert.equal(toDateOnly(date), '2026-07-08');
    assert.equal(toIsoWithoutMilliseconds(date), '2026-07-08T12:34:56Z');
  });

  it('mantiene la fecha civil de Chile cerca del cambio de día UTC', () => {
    const lateEveningInChile = new Date('2026-07-30T03:24:38.096Z');
    assert.equal(toDateOnly(lateEveningInChile), '2026-07-29');
  });

  it('calculates elapsed and remaining procedure days', () => {
    const today = new Date('2026-07-08T12:00:00Z');
    assert.equal(daysElapsedCeil('2026-07-01', today), 8);
    assert.equal(remainingProcedureDays('2026-07-01', 10, today), 2);
  });

  it('cuenta el día de apertura una sola vez en horario chileno', () => {
    const sameChileanDay = new Date('2026-07-30T03:24:38.096Z');
    assert.equal(daysElapsedCeil('2026-07-29', sameChileanDay), 1);
    assert.equal(remainingProcedureDays('2026-07-29', 60, sameChileanDay), 59);
  });
});
