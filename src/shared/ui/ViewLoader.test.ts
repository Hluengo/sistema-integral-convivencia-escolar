/** @license SPDX-License-Identifier: Apache-2.0 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHRASES, type ViewLoaderView } from './viewLoaderPhrases';

const SIDEBAR_VIEWS: ViewLoaderView[] = [
  'dashboard',
  'causas',
  'alumnos',
  'informes',
  'reportes',
  'anotaciones',
  'admin',
  'platform',
];

test('ViewLoader tiene frases no vacías para toda vista', () => {
  const allViews: ViewLoaderView[] = [...SIDEBAR_VIEWS, 'boot'];
  for (const view of allViews) {
    const phrases = PHRASES[view];
    assert.ok(Array.isArray(phrases), `PHRASES debe existir para "${view}"`);
    assert.equal(phrases.length, 3, `PHRASES["${view}"] debe tener 3 frases`);
    for (const phrase of phrases) {
      assert.equal(typeof phrase, 'string', `Frase en "${view}" debe ser texto`);
      assert.ok(phrase.trim().length > 0, `Frase vacía en "${view}"`);
    }
  }
});
