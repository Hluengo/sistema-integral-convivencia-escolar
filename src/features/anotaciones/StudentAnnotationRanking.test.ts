/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toStudentCardItems } from './annotationRankingCardItems';

describe('toStudentCardItems (ranking de estudiantes)', () => {
  const ranking = [
    {
      student_id: '11111111-1111-1111-1111-111111111111',
      student_name: 'MARÍA FERNÁNDEZ ROJAS',
      course_name: '7° Básico A',
      negative_count: 4,
    },
    {
      student_id: '22222222-2222-2222-2222-222222222222',
      student_name: 'JOSÉ MARTÍNEZ',
      course_name: '8° Básico B',
      negative_count: 2,
    },
  ];

  it('conserva los nombres y cursos cuando privacyMode está desactivado', () => {
    const items = toStudentCardItems(ranking, false);

    assert.equal(items[0].label, 'MARÍA FERNÁNDEZ ROJAS');
    assert.equal(items[0].sublabel, '7° Básico A');
    assert.equal(items[0].count, 4);
    assert.equal(items[1].label, 'JOSÉ MARTÍNEZ');
  });

  it('enmascara los nombres pero conserva el curso con privacyMode activado', () => {
    const items = toStudentCardItems(ranking, true);

    assert.notEqual(items[0].label, 'MARÍA FERNÁNDEZ ROJAS');
    assert.match(items[0].label, /^M/);
    assert.match(items[0].label, /•/);
    assert.equal(items[0].sublabel, '7° Básico A');
    assert.equal(items[0].count, 4);
    assert.notEqual(items[1].label, 'JOSÉ MARTÍNEZ');
  });

  it('maneja listas vacías', () => {
    assert.deepEqual(toStudentCardItems([], true), []);
  });
});
