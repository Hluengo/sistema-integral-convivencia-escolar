/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDisciplinaryStage } from './disciplinaryStage';

export interface AnnotationStageCounts {
  sinCartaCount: number;
  amonestacionCount: number;
  compromisoCount: number;
  derivacionCount: number;
}

const EMPTY_ANNOTATION_STAGE_COUNTS: AnnotationStageCounts = {
  sinCartaCount: 0,
  amonestacionCount: 0,
  compromisoCount: 0,
  derivacionCount: 0,
};

export function countAnnotationStages(
  students: Array<{ annotations_count: number }>,
): AnnotationStageCounts {
  const result = { ...EMPTY_ANNOTATION_STAGE_COUNTS };

  for (const student of students) {
    const negativeCount = Math.max(0, Number(student.annotations_count) || 0);
    if (negativeCount === 0) continue;

    const stage = getDisciplinaryStage(negativeCount).key;
    if (stage === 'none') result.sinCartaCount += 1;
    else if (stage === 'amonestacion') result.amonestacionCount += 1;
    else if (stage === 'compromiso_conductual') result.compromisoCount += 1;
    else if (stage === 'derivacion') result.derivacionCount += 1;
  }

  return result;
}

export function parseAnnotationStageRows(
  rows: Array<{ stage: string; count: number | string }>,
): AnnotationStageCounts {
  const result = { ...EMPTY_ANNOTATION_STAGE_COUNTS };

  for (const row of rows) {
    const count = Number(row.count) || 0;
    if (row.stage === 'verde' || row.stage === 'sin_carta') result.sinCartaCount = count;
    else if (row.stage === 'amonestacion') result.amonestacionCount = count;
    else if (row.stage === 'compromiso') result.compromisoCount = count;
    else if (row.stage === 'derivacion') result.derivacionCount = count;
  }

  return result;
}
