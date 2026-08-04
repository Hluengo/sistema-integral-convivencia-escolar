/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toTeacherCardItems } from './annotationRankingCardItems';

describe('toTeacherCardItems (ranking de docentes)', () => {
  const ranking = [
    {
      teacher_name: 'JUANA PÉREZ GONZÁLEZ',
      negative_count: 3,
      positive_count: 2,
      informative_count: 1,
      total_count: 6,
    },
    {
      teacher_name: 'PEDRO SOTO',
      negative_count: 1,
      positive_count: 0,
      informative_count: 2,
      total_count: 3,
    },
  ];

  it('conserva los nombres cuando privacyMode está desactivado', () => {
    const items = toTeacherCardItems(ranking, false);

    assert.equal(items[0].label, 'JUANA PÉREZ GONZÁLEZ');
    assert.equal(items[0].count, 3);
    assert.equal(Array.isArray(items[0].badges), true);
    assert.equal(items[1].label, 'PEDRO SOTO');
  });

  it('enmascara los nombres con privacyMode activado', () => {
    const items = toTeacherCardItems(ranking, true);

    assert.notEqual(items[0].label, 'JUANA PÉREZ GONZÁLEZ');
    assert.match(items[0].label, /^J/);
    assert.match(items[0].label, /•/);
    assert.equal(items[0].count, 3);
    assert.notEqual(items[1].label, 'PEDRO SOTO');
  });

  it('maneja listas vacías', () => {
    assert.deepEqual(toTeacherCardItems([], true), []);
  });
});
