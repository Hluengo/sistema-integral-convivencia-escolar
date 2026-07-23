/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDisciplinaryTextPagesForTest } from './disciplinaryPdfAnalysis';

test('parser detects the three annotation categories with accents and casing', () => {
  const result = parseDisciplinaryTextPagesForTest([
    '01/03/2026 Tipo: Negativa Profesor: Juan Perez Interrumpe la clase. 02/03/2026 TIPO: Positiva Reconocimiento por colaborar. 03/03/2026 Tipo: Información Entrevista con apoderado.',
  ]);

  assert.equal(result.summary.negativas, 1);
  assert.equal(result.summary.positivas, 1);
  assert.equal(result.summary.informativas, 1);
  assert.equal(result.annotations.length, 3);
});

test('parser handles multiline records across multiple pages', () => {
  const result = parseDisciplinaryTextPagesForTest([
    '05/04/2026 Tipo: Negativa Profesor: Ana Lopez Falta reiterada al reglamento interno',
    '06/04/2026 Tipo: Informativa Se registra comunicación con familia',
  ]);

  assert.equal(result.summary.negativas, 1);
  assert.equal(result.summary.informativas, 1);
  assert.equal(result.annotations[0].page_number, 1);
  assert.equal(result.annotations[1].page_number, 2);
});

test('parser returns zero annotations for empty or scanned text', () => {
  const result = parseDisciplinaryTextPagesForTest(['   ', '']);

  assert.deepEqual(result.summary, { negativas: 0, positivas: 0, informativas: 0 });
  assert.equal(result.annotations.length, 0);
});
