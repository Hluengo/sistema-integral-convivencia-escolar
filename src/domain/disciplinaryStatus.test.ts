/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDisciplinaryStatus, countByStage } from './disciplinaryStatus';

describe('calculateDisciplinaryStatus', () => {
  it('maps thresholds correctly', () => {
    assert.equal(calculateDisciplinaryStatus(0), 'Verde');
    assert.equal(calculateDisciplinaryStatus(4), 'Verde');
    assert.equal(calculateDisciplinaryStatus(5), 'Amarillo');
    assert.equal(calculateDisciplinaryStatus(9), 'Amarillo');
    assert.equal(calculateDisciplinaryStatus(10), 'Naranja');
    assert.equal(calculateDisciplinaryStatus(14), 'Naranja');
    assert.equal(calculateDisciplinaryStatus(15), 'Rojo');
    assert.equal(calculateDisciplinaryStatus(999), 'Rojo');
  });
});

describe('countByStage', () => {
  it('counts students per stage', () => {
    const students = [
      { annotations_count: 3 },
      { annotations_count: 7 },
      { annotations_count: 12 },
      { annotations_count: 20 },
    ];
    const result = countByStage(students);
    assert.equal(result.amonestacion, 1);
    assert.equal(result.compromiso, 1);
    assert.equal(result.derivacion, 1);
  });
});