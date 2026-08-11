/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AnotacionStudent } from '@/shared/lib/types';
import type { StudentCartaTableState } from '@/shared/lib/domain/disciplinaryStage';
import { matchesAnnotationFilter } from './annotationStudentFilters';
import { applyCartaStatesToStudents, buildCartaStatusLabels } from './annotationStudentCartaStates';

const baseStudent: AnotacionStudent = {
  id: 'student-1',
  full_name: 'Estudiante Demo',
  course_id: 'course-1',
  teacher_id: '',
  status: 'Activo',
  annotations_count: 4,
  positive_annotations_count: 0,
  disciplinary_status: 'Verde',
};

describe('annotationStudentCartaStates', () => {
  it('aplica la carta procesada al filtro de etapa efectiva', () => {
    const states: Record<string, StudentCartaTableState> = {
      'student-1': {
        completedLetterType: 'Amonestación Escrita',
        currentLetterType: 'Amonestación Escrita',
        workflowStatus: 'completed',
      },
    };

    const [student] = applyCartaStatesToStudents([baseStudent], states);

    assert.equal(student.effective_letter_type, 'Amonestación Escrita');
    assert.equal(matchesAnnotationFilter(student, 'sin_carta'), false);
    assert.equal(matchesAnnotationFilter(student, 'amonestacion'), true);
  });

  it('construye etiquetas de estado de carta desde el estado de tabla', () => {
    const states: Record<string, StudentCartaTableState> = {
      'student-1': {
        completedLetterType: 'Amonestación Escrita',
        currentLetterType: 'Amonestación Escrita',
        workflowStatus: 'completed',
      },
    };

    assert.deepEqual(buildCartaStatusLabels([baseStudent], states), {
      'student-1': ['Procesada'],
    });
  });
});
