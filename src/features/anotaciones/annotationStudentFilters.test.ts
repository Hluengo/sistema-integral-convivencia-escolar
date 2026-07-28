/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { getAnnotationRange, matchesAnnotationFilter } from './annotationStudentFilters';

describe('annotationStudentFilters', () => {
  it('incluye en Con Registro a estudiantes Sin Carta desde una anotación negativa', () => {
    const range = getAnnotationRange('con_registro');

    expect(range).toEqual([1, Number.POSITIVE_INFINITY]);
    expect(
      [0, 1, 4, 5, 15].filter((count) => {
        if (!range) return false;
        return count >= range[0] && count <= range[1];
      }),
    ).toEqual([1, 4, 5, 15]);
  });

  it('clasifica Sin Carta únicamente entre 1 y 4 anotaciones negativas', () => {
    const range = getAnnotationRange('sin_carta');

    expect(range).toEqual([1, 4]);
    expect(
      [0, 1, 4, 5].filter((count) => {
        if (!range) return false;
        return count >= range[0] && count <= range[1];
      }),
    ).toEqual([1, 4]);
  });

  it('mantiene sin cambios los rangos de las medidas disciplinarias', () => {
    expect(getAnnotationRange('amonestacion')).toEqual([5, 9]);
    expect(getAnnotationRange('compromiso')).toEqual([10, 14]);
    expect(getAnnotationRange('derivacion')).toEqual([15, Number.POSITIVE_INFINITY]);
  });

  it('clasifica en Derivación una carta procesada aunque el conteo sea 14', () => {
    const student = {
      annotations_count: 14,
      effective_letter_type: 'Ficha de Derivación' as const,
    };

    expect(matchesAnnotationFilter(student, 'derivacion')).toBe(true);
    expect(matchesAnnotationFilter(student, 'compromiso')).toBe(false);
  });

  it('no deja como Sin Carta a quien tiene una constancia física vigente', () => {
    const student = {
      annotations_count: 4,
      effective_letter_type: 'Amonestación Escrita' as const,
    };

    expect(matchesAnnotationFilter(student, 'sin_carta')).toBe(false);
    expect(matchesAnnotationFilter(student, 'amonestacion')).toBe(true);
  });
});
