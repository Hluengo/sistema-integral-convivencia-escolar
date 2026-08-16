/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getEffectiveDisciplinaryStage,
  mapLetterTypeToDocType,
  type LetterType,
} from './disciplinaryStage';

export interface AnnotationStageBreakdown {
  total: number;
  pending: number;
  processed: number;
  archived: number;
}

export interface AnnotationStageCounts {
  sinCarta: AnnotationStageBreakdown;
  amonestacion: AnnotationStageBreakdown;
  compromiso: AnnotationStageBreakdown;
  derivacion: AnnotationStageBreakdown;
}

export function createEmptyAnnotationStageCounts(): AnnotationStageCounts {
  return {
    sinCarta: { total: 0, pending: 0, processed: 0, archived: 0 },
    amonestacion: { total: 0, pending: 0, processed: 0, archived: 0 },
    compromiso: { total: 0, pending: 0, processed: 0, archived: 0 },
    derivacion: { total: 0, pending: 0, processed: 0, archived: 0 },
  };
}

interface AnnotationStageStudent {
  annotations_count: number;
  effective_letter_type?: LetterType | null;
  archived_letter_type?: LetterType | null;
}

export function countAnnotationStages(students: AnnotationStageStudent[]): AnnotationStageCounts {
  const result = createEmptyAnnotationStageCounts();

  for (const student of students) {
    const negativeCount = Math.max(0, Number(student.annotations_count) || 0);
    if (negativeCount === 0 && !student.effective_letter_type) continue;

    const stage = getEffectiveDisciplinaryStage(negativeCount, student.effective_letter_type).key;
    const completedStage = mapLetterTypeToDocType(student.effective_letter_type);
    const archivedStage = mapLetterTypeToDocType(student.archived_letter_type);
    const isProcessed = stage !== 'none' && completedStage === stage;
    const bucket =
      stage === 'derivacion'
        ? result.derivacion
        : stage === 'compromiso_conductual'
          ? result.compromiso
          : stage === 'amonestacion'
            ? result.amonestacion
            : result.sinCarta;

    bucket.total += 1;
    if (archivedStage === stage) bucket.archived += 1;
    else if (isProcessed) bucket.processed += 1;
    else bucket.pending += 1;
  }

  return result;
}

export function parseAnnotationStageRows(
  rows: Array<{
    stage: string;
    count?: number | string;
    total_count?: number | string;
    pending_count?: number | string;
    processed_count?: number | string;
    archived_count?: number | string;
  }>,
): AnnotationStageCounts {
  const result = createEmptyAnnotationStageCounts();

  for (const row of rows) {
    const total = Number(row.total_count ?? row.count) || 0;
    const processed = Number(row.processed_count) || 0;
    const archived = Number(row.archived_count) || 0;
    const pending =
      row.pending_count === undefined ? total - processed - archived : Number(row.pending_count);
    const bucket =
      row.stage === 'derivacion'
        ? result.derivacion
        : row.stage === 'compromiso'
          ? result.compromiso
          : row.stage === 'amonestacion'
            ? result.amonestacion
            : row.stage === 'verde' || row.stage === 'sin_carta'
              ? result.sinCarta
              : null;

    if (!bucket) continue;
    bucket.total = total;
    bucket.pending = Math.max(0, pending || 0);
    bucket.processed = processed;
    bucket.archived = archived;
  }

  return result;
}
