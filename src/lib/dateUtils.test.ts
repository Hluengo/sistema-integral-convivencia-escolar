import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { daysElapsedCeil, remainingProcedureDays, toDateOnly, toIsoWithoutMilliseconds } from './dateUtils';

describe('dateUtils', () => {
  it('formats date-only and ISO strings consistently', () => {
    const date = new Date('2026-07-08T12:34:56.000Z');
    assert.equal(toDateOnly(date), '2026-07-08');
    assert.equal(toIsoWithoutMilliseconds(date), '2026-07-08T12:34:56Z');
  });

  it('calculates elapsed and remaining procedure days', () => {
    const today = new Date('2026-07-08T12:00:00Z');
    assert.equal(daysElapsedCeil('2026-07-01', today), 8);
    assert.equal(remainingProcedureDays('2026-07-01', 10, today), 2);
  });
});
