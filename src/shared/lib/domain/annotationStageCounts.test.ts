/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countAnnotationStages, parseAnnotationStageRows } from './annotationStageCounts';

describe('annotationStageCounts', () => {
  it('cuenta Sin Carta solamente entre 1 y 4 anotaciones negativas', () => {
    const counts = countAnnotationStages(
      [0, 1, 4, 5, 9, 10, 14, 15].map((annotations_count) => ({ annotations_count })),
    );

    assert.deepEqual(counts, {
      sinCartaCount: 2,
      amonestacionCount: 2,
      compromisoCount: 2,
      derivacionCount: 1,
    });
  });

  it('interpreta la etapa verde de la RPC como Sin Carta', () => {
    assert.deepEqual(
      parseAnnotationStageRows([
        { stage: 'verde', count: '3' },
        { stage: 'amonestacion', count: 2 },
        { stage: 'compromiso', count: 1 },
        { stage: 'derivacion', count: 4 },
      ]),
      {
        sinCartaCount: 3,
        amonestacionCount: 2,
        compromisoCount: 1,
        derivacionCount: 4,
      },
    );
  });
});
