/** @license SPDX-License-Identifier: Apache-2.0 */

export function getAnnotationBlocks(
  annotations?: Array<{ text: string; date: string; severity: string }>,
): Array<{ text: string; date: string; severity: string }> {
  if (!annotations || annotations.length === 0) { return []; }
  return annotations.slice().sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
