/** @license SPDX-License-Identifier: Apache-2.0 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDisciplinaryStatus,
  getDisciplinaryStatusLabel,
  countByStage,
} from './disciplinaryStatus.ts';

describe('calculateDisciplinaryStatus', () => {
  it('maps thresholds correctly', () => {
    assert.equal(calculateDisciplinaryStatus(0), 'Verde');
    assert.equal(calculateDisciplinaryStatus(4), 'Verde');
    assert.equal(calculateDisciplinaryStatus(5), 'Amarillo');
    assert.equal(calculateDisciplinaryStatus(9), 'Amarillo');
    assert.equal(calculateDisciplinaryStatus(10), 'Naranja');
    assert.equal(calculateDisciplinaryStatus(14), 'Naranja');
    assert.equal(calculateDisciplinaryStatus(15), 'Rojo');
    assert.equal(calculateDisciplinaryStatus(20), 'Rojo');
  });
});

describe('getDisciplinaryStatusLabel', () => {
  it('returns RICE stage labels', () => {
    assert.equal(getDisciplinaryStatusLabel(3), 'Sin Registro');
    assert.equal(getDisciplinaryStatusLabel(6), 'Carta de Amonestación');
    assert.equal(getDisciplinaryStatusLabel(12), 'Carta de Compromiso');
    assert.equal(getDisciplinaryStatusLabel(16), 'Derivado a CE');
  });
});

describe('countByStage', () => {
  it('counts students per stage', () => {
    const result = countByStage([
      { annotations_count: 2 },
      { annotations_count: 7 },
      { annotations_count: 11 },
      { annotations_count: 18 },
      { annotations_count: 9 },
    ]);
    assert.equal(result.amonestacion, 2);
    assert.equal(result.compromiso, 1);
    assert.equal(result.derivacion, 1);
  });
});
