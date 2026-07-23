/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitize as sanitizeApi } from '../api/validators/sanitizers';
import { sanitize as sanitizeServer } from './validators';

const implementations = [
  ['api', sanitizeApi],
  ['server', sanitizeServer],
] as const;

for (const [name, sanitize] of implementations) {
  test(`${name} sanitize preserves normal Spanish text and safe punctuation`, () => {
    assert.equal(sanitize('José Ñancupil / curso 7.B  '), 'José Ñancupil / curso 7.B  ');
  });

  test(`${name} sanitize removes ASCII and C1 control characters`, () => {
    assert.equal(sanitize(`A${String.fromCharCode(0)}B${String.fromCharCode(31)}C${String.fromCharCode(127)}D${String.fromCharCode(159)}E`), 'ABCDE');
  });

  test(`${name} sanitize handles empty and non-string input`, () => {
    assert.equal(sanitize(''), '');
    assert.equal(sanitize(null), '');
    assert.equal(sanitize(undefined), '');
  });

  test(`${name} sanitize removes newlines and tabs with other control characters`, () => {
    assert.equal(sanitize('Linea 1\nLinea 2\tFinal'), 'Linea 1Linea 2Final');
  });

  test(`${name} sanitize preserves non-control Unicode`, () => {
    assert.equal(sanitize('áéíóú ü Ñ ñ — ✓'), 'áéíóú ü Ñ ñ — ✓');
  });
}
