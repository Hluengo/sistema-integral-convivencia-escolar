/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getAnnotationRange(filter: string): [number, number] | null {
  switch (filter) {
    case 'con_registro':
      return [5, Number.POSITIVE_INFINITY];
    case 'sin_carta':
      return [1, 4];
    case 'amonestacion':
      return [5, 9];
    case 'compromiso':
      return [10, 14];
    case 'derivacion':
      return [15, Number.POSITIVE_INFINITY];
    default:
      return null;
  }
}
