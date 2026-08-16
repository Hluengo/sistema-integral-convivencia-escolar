/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAnalysisVariation } from './analysisComparison';

describe('getAnalysisVariation', () => {
  it('compara cada clasificación entre el PDF anterior y el nuevo', () => {
    assert.deepEqual(
      getAnalysisVariation(
        { negativas: 7, positivas: 0, informativas: 3 },
        { negativas: 10, positivas: 0, informativas: 2 },
      ),
      { negativas: 3, positivas: 0, informativas: -1 },
    );
  });
});
