/** @license SPDX-License-Identifier: Apache-2.0 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyByNegativeCount } from './riceMeasures.ts';

describe('classifyByNegativeCount', () => {
  it('does not allow formal registration under 5', () => {
    const r = classifyByNegativeCount(4);
    assert.equal(r.canRegister, false);
    assert.equal(r.stepNumber, 1);
  });

  it('suggests amonestacion for 5-9', () => {
    const r = classifyByNegativeCount(7);
    assert.equal(r.canRegister, true);
    assert.match(r.measure, /Amonestación/i);
    assert.equal(r.stepNumber, 2);
  });

  it('suggests compromiso for 10-14', () => {
    const r = classifyByNegativeCount(12);
    assert.equal(r.canRegister, true);
    assert.match(r.measure, /Compromiso/i);
    assert.equal(r.stepNumber, 3);
  });

  it('suggests derivacion for 15+', () => {
    const r = classifyByNegativeCount(15);
    assert.equal(r.canRegister, true);
    assert.match(r.measure, /Convivencia/i);
    assert.equal(r.stepNumber, 4);
  });
});
