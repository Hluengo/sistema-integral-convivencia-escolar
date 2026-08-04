/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aggregateCourseCartaRanking } from './courseCartaRanking';

describe('aggregateCourseCartaRanking', () => {
  it('devuelve ranking de cursos por total de cartas, limitado a 5 cuando se solicita', () => {
    const cartas = [
      { course_name: '7° Básico A', letter_type: 'Amonestación Escrita', status: 'Vigente' },
      { course_name: '7° Básico A', letter_type: 'Amonestación Escrita', status: 'Vigente' },
      {
        course_name: '8° Básico B',
        letter_type: 'Carta de Compromiso Conductual',
        status: 'Vigente',
      },
      { course_name: '8° Básico B', letter_type: 'Ficha de Derivación', status: 'Vigente' },
      { course_name: '1° Medio A', letter_type: 'Amonestación Escrita', status: 'Vigente' },
      {
        course_name: '2° Medio C',
        letter_type: 'Carta de Compromiso Conductual',
        status: 'Vigente',
      },
      { course_name: '3° Medio D', letter_type: 'Ficha de Derivación', status: 'Vigente' },
      { course_name: '4° Medio E', letter_type: 'Amonestación Escrita', status: 'Vigente' },
      {
        course_name: '4° Medio E',
        letter_type: 'Carta de Compromiso Conductual',
        status: 'Vigente',
      },
      { course_name: '4° Medio E', letter_type: 'Ficha de Derivación', status: 'Vigente' },
    ];

    const ranking = aggregateCourseCartaRanking(cartas, 5);

    assert.deepEqual(ranking, [
      {
        course_name: '4° Medio E',
        amonestacion_count: 1,
        compromiso_count: 1,
        derivacion_count: 1,
        total_count: 3,
      },
      {
        course_name: '7° Básico A',
        amonestacion_count: 2,
        compromiso_count: 0,
        derivacion_count: 0,
        total_count: 2,
      },
      {
        course_name: '8° Básico B',
        amonestacion_count: 0,
        compromiso_count: 1,
        derivacion_count: 1,
        total_count: 2,
      },
      {
        course_name: '1° Medio A',
        amonestacion_count: 1,
        compromiso_count: 0,
        derivacion_count: 0,
        total_count: 1,
      },
      {
        course_name: '2° Medio C',
        amonestacion_count: 0,
        compromiso_count: 1,
        derivacion_count: 0,
        total_count: 1,
      },
    ]);
  });

  it('devuelve hasta 12 cursos por defecto', () => {
    const ranking = aggregateCourseCartaRanking(
      Array.from({ length: 13 }, (_, index) => ({
        course_name: `${index + 1}° Básico A`,
        letter_type: 'Amonestación Escrita',
        status: 'Vigente',
      })),
    );

    assert.equal(ranking.length, 12);
  });

  it('ignora cartas anuladas', () => {
    const ranking = aggregateCourseCartaRanking([
      { course_name: '7° Básico A', letter_type: 'Amonestación Escrita', status: 'Anulada' },
      { course_name: '7° Básico A', letter_type: 'Amonestación Escrita', status: 'Vigente' },
    ]);

    assert.deepEqual(ranking, [
      {
        course_name: '7° Básico A',
        amonestacion_count: 1,
        compromiso_count: 0,
        derivacion_count: 0,
        total_count: 1,
      },
    ]);
  });

  it('agrupa cursos sin nombre como Sin curso', () => {
    const ranking = aggregateCourseCartaRanking([
      { course_name: null, letter_type: 'Amonestación Escrita', status: 'Vigente' },
    ]);

    assert.deepEqual(ranking, [
      {
        course_name: 'Sin curso',
        amonestacion_count: 1,
        compromiso_count: 0,
        derivacion_count: 0,
        total_count: 1,
      },
    ]);
  });

  it('devuelve arreglo vacío cuando no hay cartas', () => {
    assert.deepEqual(aggregateCourseCartaRanking([]), []);
  });
});
