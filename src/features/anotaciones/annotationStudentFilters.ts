/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getEffectiveDisciplinaryStage,
  type LetterType,
} from '../../shared/lib/domain/disciplinaryStage';

interface AnnotationFilterStudent {
  annotations_count: number;
  effective_letter_type?: LetterType | null;
}

export function getAnnotationRange(filter: string): [number, number] | null {
  switch (filter) {
    case 'con_registro':
      return [1, Number.POSITIVE_INFINITY];
    case 'sin_carta':
      return [1, 4];
    case 'amonestacion':
      return [5, 9];
    case 'compromiso':
      return [10, 14];
    case 'derivacion':
      return [15, Number.POSITIVE_INFINITY];
    default:
      return null;
  }
}

export function matchesAnnotationFilter(student: AnnotationFilterStudent, filter: string): boolean {
  const negativeCount = Math.max(0, Number(student.annotations_count) || 0);
  const stage = getEffectiveDisciplinaryStage(negativeCount, student.effective_letter_type);

  if (filter === 'con_registro') {
    return negativeCount >= 1 || Boolean(student.effective_letter_type);
  }
  if (filter === 'sin_carta') {
    return negativeCount >= 1 && negativeCount <= 4 && stage.key === 'none';
  }
  if (filter === 'amonestacion') return stage.key === 'amonestacion';
  if (filter === 'compromiso') return stage.key === 'compromiso_conductual';
  if (filter === 'derivacion') return stage.key === 'derivacion';
  return true;
}
