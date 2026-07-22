/** @license SPDX-License-Identifier: Apache-2.0 */

const dotClassMap: Record<string, string> = {
  Leve: 'bg-emerald-500',
  Grave: 'bg-yellow-500',
  'Muy Grave': 'bg-orange-500',
};

export const severityDot = (severity?: string | null): string =>
  dotClassMap[severity ?? ''] ?? 'bg-neutral-300';
