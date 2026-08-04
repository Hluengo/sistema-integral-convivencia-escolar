/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aggregateStudentAnnotationRanking,
  aggregateTeacherAnnotationRanking,
} from './annotationRankings';

describe('aggregateTeacherAnnotationRanking', () => {
  it('rankea docentes solo por anotaciones negativas, limitado a 5', () => {
    const annotations = [
      { teacher_name: 'A', annotation_type: 'Negativa' },
      { teacher_name: 'A', annotation_type: 'Negativa' },
      { teacher_name: 'B', annotation_type: 'Negativa' },
      { teacher_name: 'B', annotation_type: 'Positiva' },
      { teacher_name: 'C', annotation_type: 'Negativa' },
      { teacher_name: 'C', annotation_type: 'Negativa' },
      { teacher_name: 'C', annotation_type: 'Negativa' },
      { teacher_name: 'D', annotation_type: 'Negativa' },
      { teacher_name: 'E', annotation_type: 'Negativa' },
      { teacher_name: 'F', annotation_type: 'Negativa' },
    ];

    const ranking = aggregateTeacherAnnotationRanking(annotations);

    assert.deepEqual(ranking, [
      {
        teacher_name: 'C',
        negative_count: 3,
        positive_count: 0,
        informative_count: 0,
        total_count: 3,
      },
      {
        teacher_name: 'A',
        negative_count: 2,
        positive_count: 0,
        informative_count: 0,
        total_count: 2,
      },
      {
        teacher_name: 'B',
        negative_count: 1,
        positive_count: 1,
        informative_count: 0,
        total_count: 2,
      },
      {
        teacher_name: 'D',
        negative_count: 1,
        positive_count: 0,
        informative_count: 0,
        total_count: 1,
      },
      {
        teacher_name: 'E',
        negative_count: 1,
        positive_count: 0,
        informative_count: 0,
        total_count: 1,
      },
    ]);
  });

  it('excluye docentes sin anotaciones negativas', () => {
    const ranking = aggregateTeacherAnnotationRanking([
      { teacher_name: 'A', annotation_type: 'Positiva' },
      { teacher_name: 'B', annotation_type: 'Información' },
    ]);

    assert.deepEqual(ranking, []);
  });

  it('no cuenta anotaciones positivas o informativas en el conteo', () => {
    const ranking = aggregateTeacherAnnotationRanking([
      { teacher_name: 'A', annotation_type: 'Negativa' },
      { teacher_name: 'A', annotation_type: 'Negativa' },
      { teacher_name: 'A', annotation_type: 'Positiva' },
      { teacher_name: 'A', annotation_type: 'Información' },
    ]);

    assert.deepEqual(ranking, [
      {
        teacher_name: 'A',
        negative_count: 2,
        positive_count: 1,
        informative_count: 1,
        total_count: 4,
      },
    ]);
  });

  it('agrupa docentes sin nombre como Sin profesor', () => {
    const ranking = aggregateTeacherAnnotationRanking([
      { teacher_name: null, annotation_type: 'Negativa' },
      { teacher_name: '  ', annotation_type: 'Negativa' },
    ]);

    assert.deepEqual(ranking, [
      {
        teacher_name: 'Sin profesor',
        negative_count: 2,
        positive_count: 0,
        informative_count: 0,
        total_count: 2,
      },
    ]);
  });

  it('devuelve arreglo vacío cuando no hay anotaciones', () => {
    assert.deepEqual(aggregateTeacherAnnotationRanking([]), []);
  });
});

describe('aggregateStudentAnnotationRanking', () => {
  it('rankea estudiantes por anotaciones negativas, limitado a 5', () => {
    const students = [
      { id: '1', full_name: 'Ana', course_name: '7° Básico A', annotations_count: 26 },
      { id: '2', full_name: 'Bruno', course_name: '8° Básico B', annotations_count: 24 },
      { id: '3', full_name: 'Carla', course_name: '1° Medio A', annotations_count: 22 },
      { id: '4', full_name: 'Diego', course_name: '2° Medio B', annotations_count: 20 },
      { id: '5', full_name: 'Elena', course_name: '3° Medio C', annotations_count: 18 },
      { id: '6', full_name: 'Franco', course_name: '4° Medio D', annotations_count: 17 },
    ];

    const ranking = aggregateStudentAnnotationRanking(students, 5);

    assert.deepEqual(ranking, [
      {
        student_id: '1',
        student_name: 'Ana',
        course_name: '7° Básico A',
        negative_count: 26,
      },
      {
        student_id: '2',
        student_name: 'Bruno',
        course_name: '8° Básico B',
        negative_count: 24,
      },
      {
        student_id: '3',
        student_name: 'Carla',
        course_name: '1° Medio A',
        negative_count: 22,
      },
      {
        student_id: '4',
        student_name: 'Diego',
        course_name: '2° Medio B',
        negative_count: 20,
      },
      {
        student_id: '5',
        student_name: 'Elena',
        course_name: '3° Medio C',
        negative_count: 18,
      },
    ]);
  });

  it('devuelve hasta 12 estudiantes por defecto', () => {
    const ranking = aggregateStudentAnnotationRanking(
      Array.from({ length: 13 }, (_, index) => ({
        id: String(index + 1),
        full_name: `Estudiante ${index + 1}`,
        course_name: '7° Básico A',
        annotations_count: index + 1,
      })),
    );

    assert.equal(ranking.length, 12);
  });

  it('excluye estudiantes sin anotaciones', () => {
    const ranking = aggregateStudentAnnotationRanking([
      { id: '1', full_name: 'Ana', course_name: '7° Básico A', annotations_count: 0 },
    ]);

    assert.deepEqual(ranking, []);
  });

  it('usa Sin curso cuando el curso es null o vacío', () => {
    const ranking = aggregateStudentAnnotationRanking([
      { id: '1', full_name: 'Ana', course_name: null, annotations_count: 5 },
      { id: '2', full_name: 'Bruno', course_name: '  ', annotations_count: 3 },
    ]);

    assert.deepEqual(ranking, [
      {
        student_id: '1',
        student_name: 'Ana',
        course_name: 'Sin curso',
        negative_count: 5,
      },
      {
        student_id: '2',
        student_name: 'Bruno',
        course_name: 'Sin curso',
        negative_count: 3,
      },
    ]);
  });

  it('devuelve arreglo vacío cuando no hay estudiantes', () => {
    assert.deepEqual(aggregateStudentAnnotationRanking([]), []);
  });
});
