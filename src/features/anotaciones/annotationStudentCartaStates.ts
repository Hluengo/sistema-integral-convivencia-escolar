/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AnotacionStudent } from '@/shared/lib/types';
import {
  getStudentCartaWorkflowLabel,
  type StudentCartaTableState,
} from '@/shared/lib/domain/disciplinaryStage';

export function applyCartaStatesToStudents(
  students: AnotacionStudent[],
  states: Record<string, StudentCartaTableState> | undefined,
): AnotacionStudent[] {
  if (!states) return students;

  return students.map((student) => {
    const completedLetterType = states[student.id]?.completedLetterType;
    if (!completedLetterType || student.effective_letter_type === completedLetterType) {
      return student;
    }
    return { ...student, effective_letter_type: completedLetterType };
  });
}

export function buildCartaStatusLabels(
  students: AnotacionStudent[],
  states: Record<string, StudentCartaTableState> | undefined,
): Record<string, string[]> {
  const statuses: Record<string, string[]> = {};

  for (const student of students) {
    const cartaStatus = getStudentCartaWorkflowLabel(
      student.annotations_count,
      states?.[student.id],
    );
    if (cartaStatus) statuses[student.id] = [cartaStatus];
  }

  return statuses;
}
