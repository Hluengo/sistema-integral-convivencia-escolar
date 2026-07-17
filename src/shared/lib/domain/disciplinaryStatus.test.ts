/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateDisciplinaryStatus, countByStage } from './disciplinaryStatus';

describe('calculateDisciplinaryStatus', () => {
  it('returns Verde for 0 annotations', () => {
    assert.equal(calculateDisciplinaryStatus(0), 'Verde');
  });

  it('returns Verde for 4 annotations', () => {
    assert.equal(calculateDisciplinaryStatus(4), 'Verde');
  });

  it('returns Amarillo for 5 annotations', () => {
    assert.equal(calculateDisciplinaryStatus(5), 'Amarillo');
  });

  it('returns Amarillo for 9 annotations', () => {
    assert.equal(calculateDisciplinaryStatus(9), 'Amarillo');
  });

  it('returns Naranja for 10 annotations', () => {
    assert.equal(calculateDisciplinaryStatus(10), 'Naranja');
  });

  it('returns Naranja for 14 annotations', () => {
    assert.equal(calculateDisciplinaryStatus(14), 'Naranja');
  });

  it('returns Rojo for 15 annotations', () => {
    assert.equal(calculateDisciplinaryStatus(15), 'Rojo');
  });

  it('returns Rojo for 100 annotations', () => {
    assert.equal(calculateDisciplinaryStatus(100), 'Rojo');
  });

  it('returns Verde for negative count', () => {
    assert.equal(calculateDisciplinaryStatus(-1), 'Verde');
  });
});

describe('countByStage', () => {
  it('counts 0 when all students have 0 annotations', () => {
    const students = [
      { annotations_count: 0 },
      { annotations_count: 0 },
      { annotations_count: 0 },
    ] as Array<{ annotations_count: number }>;
    const result = countByStage(students);
    assert.equal(result.amonestacion, 0);
    assert.equal(result.compromiso, 0);
    assert.equal(result.derivacion, 0);
  });

  it('counts amonestacion correctly (5-9 annotations)', () => {
    const students = [
      { annotations_count: 5 },
      { annotations_count: 7 },
    ] as Array<{ annotations_count: number }>;
    const result = countByStage(students);
    assert.equal(result.amonestacion, 2);
    assert.equal(result.compromiso, 0);
    assert.equal(result.derivacion, 0);
  });

  it('counts compromiso correctly (10-14 annotations)', () => {
    const students = [
      { annotations_count: 10 },
      { annotations_count: 12 },
      { annotations_count: 14 },
    ] as Array<{ annotations_count: number }>;
    const result = countByStage(students);
    assert.equal(result.amonestacion, 0);
    assert.equal(result.compromiso, 3);
    assert.equal(result.derivacion, 0);
  });

  it('counts derivacion correctly (15+ annotations)', () => {
    const students = [
      { annotations_count: 15 },
      { annotations_count: 20 },
    ] as Array<{ annotations_count: number }>;
    const result = countByStage(students);
    assert.equal(result.amonestacion, 0);
    assert.equal(result.compromiso, 0);
    assert.equal(result.derivacion, 2);
  });

  it('counts all stages correctly with mixed values', () => {
    const students = [
      { annotations_count: 3 },
      { annotations_count: 7 },
      { annotations_count: 12 },
      { annotations_count: 18 },
      { annotations_count: 0 },
    ] as Array<{ annotations_count: number }>;
    const result = countByStage(students);
    assert.equal(result.amonestacion, 1);
    assert.equal(result.compromiso, 1);
    assert.equal(result.derivacion, 1);
  });
});
