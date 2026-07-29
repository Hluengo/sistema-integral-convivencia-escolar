/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAnnotationRange, matchesAnnotationFilter } from './annotationStudentFilters';

describe('annotationStudentFilters', () => {
  it('incluye en Con Registro a estudiantes Sin Carta desde una anotación negativa', () => {
    const range = getAnnotationRange('con_registro');

    assert.deepEqual(range, [1, Number.POSITIVE_INFINITY]);
    assert.deepEqual(
      [0, 1, 4, 5, 15].filter((count) => {
        if (!range) return false;
        return count >= range[0] && count <= range[1];
      }),
      [1, 4, 5, 15],
    );
  });

  it('clasifica Sin Carta únicamente entre 1 y 4 anotaciones negativas', () => {
    const range = getAnnotationRange('sin_carta');

    assert.deepEqual(range, [1, 4]);
    assert.deepEqual(
      [0, 1, 4, 5].filter((count) => {
        if (!range) return false;
        return count >= range[0] && count <= range[1];
      }),
      [1, 4],
    );
  });

  it('mantiene sin cambios los rangos de las medidas disciplinarias', () => {
    assert.deepEqual(getAnnotationRange('amonestacion'), [5, 9]);
    assert.deepEqual(getAnnotationRange('compromiso'), [10, 14]);
    assert.deepEqual(getAnnotationRange('derivacion'), [15, Number.POSITIVE_INFINITY]);
  });

  it('clasifica en Derivación una carta procesada aunque el conteo sea 14', () => {
    const student = {
      annotations_count: 14,
      effective_letter_type: 'Ficha de Derivación' as const,
    };

    assert.equal(matchesAnnotationFilter(student, 'derivacion'), true);
    assert.equal(matchesAnnotationFilter(student, 'compromiso'), false);
  });

  it('no deja como Sin Carta a quien tiene una constancia física vigente', () => {
    const student = {
      annotations_count: 4,
      effective_letter_type: 'Amonestación Escrita' as const,
    };

    assert.equal(matchesAnnotationFilter(student, 'sin_carta'), false);
    assert.equal(matchesAnnotationFilter(student, 'amonestacion'), true);
  });
});
