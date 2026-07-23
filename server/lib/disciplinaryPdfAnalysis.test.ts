/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractDisciplinaryMetadataForTest,
  parseDisciplinaryTextPagesForTest,
} from './disciplinaryPdfAnalysis';

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
test('metadata parser detects student and course from convivencia report format', () => {
  const result = extractDisciplinaryMetadataForTest(`
    ANCALAO SOLORZA BENJAMÍN ADOLFO
    FICHA PERSONAL DE CONVIVENCIA ESCOLAR
    Rango Fechas:
    Curso :
    02/03/2026 a 20/07/2026
    1A MEDIO
    10/04/2026 Tipo: Información
    23/04/2026 Tipo: Negativa
  `);

  assert.equal(result.studentName, 'Ancalao Solorza Benjamín Adolfo');
  assert.equal(result.course, '1° Medio A');
});
test('parser deduplicates repeated PDF text layers', () => {
  const repeated = Array.from({ length: 3 }, () =>
    '23/04/2026 Tipo: Negativa Profesor: Ana Lopez Falta reiterada al reglamento interno. 10/04/2026 Tipo: Información Entrevista con apoderado.'
  ).join(' ');
  const result = parseDisciplinaryTextPagesForTest([repeated]);

  assert.equal(result.summary.negativas, 1);
  assert.equal(result.summary.informativas, 1);
  assert.equal(result.annotations.length, 2);
});

test('metadata parser normalizes basic course labels', () => {
  const result = extractDisciplinaryMetadataForTest(`
    ESTUDIANTE DE PRUEBA APELLIDO
    FICHA PERSONAL DE CONVIVENCIA ESCOLAR
    Curso :
    7A BASICO
  `);

  assert.equal(result.course, '7° Básico A');
});