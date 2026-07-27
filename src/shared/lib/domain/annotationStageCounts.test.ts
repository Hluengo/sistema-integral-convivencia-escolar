/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { countAnnotationStages, parseAnnotationStageRows } from './annotationStageCounts';

describe('annotationStageCounts', () => {
  it('cuenta Sin Carta solamente entre 1 y 4 anotaciones negativas', () => {
    const counts = countAnnotationStages(
      [0, 1, 4, 5, 9, 10, 14, 15].map((annotations_count) => ({ annotations_count })),
    );

    expect(counts).toEqual({
      sinCartaCount: 2,
      amonestacionCount: 2,
      compromisoCount: 2,
      derivacionCount: 1,
    });
  });

  it('interpreta la etapa verde de la RPC como Sin Carta', () => {
    expect(
      parseAnnotationStageRows([
        { stage: 'verde', count: '3' },
        { stage: 'amonestacion', count: 2 },
        { stage: 'compromiso', count: 1 },
        { stage: 'derivacion', count: 4 },
      ]),
    ).toEqual({
      sinCartaCount: 3,
      amonestacionCount: 2,
      compromisoCount: 1,
      derivacionCount: 4,
    });
  });
});
