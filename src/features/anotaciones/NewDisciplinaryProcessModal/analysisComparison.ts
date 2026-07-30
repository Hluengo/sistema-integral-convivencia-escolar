/** @license SPDX-License-Identifier: Apache-2.0 */

import type { AnnotationSummary } from '@/src/shared/lib/types';

export function getAnalysisVariation(
  previous: AnnotationSummary,
  current: AnnotationSummary,
): AnnotationSummary {
  return {
    negativas: current.negativas - previous.negativas,
    positivas: current.positivas - previous.positivas,
    informativas: current.informativas - previous.informativas,
  };
}
