/** @license SPDX-License-Identifier: Apache-2.0 */

import type { DisciplinaryStatus } from '../types';

export const DISCIPLINARY_THRESHOLDS = {
  greenMax: 4,
  yellowMax: 9,
  orangeMax: 14,
} as const;

export function calculateDisciplinaryStatus(negativeCount: number): DisciplinaryStatus {
  if (negativeCount < 5) return 'Verde';
  if (negativeCount < 10) return 'Amarillo';
  if (negativeCount < 15) return 'Naranja';
  return 'Rojo';
}

export function countByStage(students: { annotations_count: number }[]) {
  return {
    amonestacion: students.filter((s) => s.annotations_count >= 5 && s.annotations_count < 10).length,
    compromiso: students.filter((s) => s.annotations_count >= 10 && s.annotations_count < 15).length,
    derivacion: students.filter((s) => s.annotations_count >= 15).length,
  };
}
