/** @license SPDX-License-Identifier: Apache-2.0 */

import type { DisciplinaryStatus } from '../types';

/** Umbrales RICE Art. 24.BIS (anotaciones negativas acumuladas). */
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

export function getDisciplinaryStatusLabel(negativeCount: number): string {
  if (negativeCount >= 15) return 'Derivado a CE';
  if (negativeCount >= 10) return 'Carta de Compromiso';
  if (negativeCount >= 5) return 'Carta de Amonestación';
  return 'Sin Registro';
}

export function getDisciplinaryStatusStyle(negativeCount: number): string {
  if (negativeCount >= 15) return 'bg-rose-50 border-rose-200 text-rose-700';
  if (negativeCount >= 10) return 'bg-orange-50 border-orange-200 text-orange-700';
  if (negativeCount >= 5) return 'bg-amber-50 border-amber-200 text-amber-700';
  return 'bg-slate-50 border-slate-200 text-slate-500';
}

export function countByStage(students: { annotations_count: number }[]) {
  return {
    amonestacion: students.filter((s) => s.annotations_count >= 5 && s.annotations_count < 10).length,
    compromiso: students.filter((s) => s.annotations_count >= 10 && s.annotations_count < 15).length,
    derivacion: students.filter((s) => s.annotations_count >= 15).length,
  };
}
