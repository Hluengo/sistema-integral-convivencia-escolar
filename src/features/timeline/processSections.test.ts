/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROCESS_SECTIONS } from './processSections';

describe('PROCESS_SECTIONS', () => {
  it('define las 5 fases del debido proceso en orden', () => {
    assert.deepEqual(
      PROCESS_SECTIONS.map((s) => s.id),
      ['recepcion', 'investigacion', 'resolucion', 'impugnacion', 'seguimiento'],
    );
  });

  it('usa prefijos de checklist únicos por fase', () => {
    const prefixes = PROCESS_SECTIONS.map((s) => s.prefix);
    assert.equal(new Set(prefixes).size, prefixes.length);
    assert.deepEqual(prefixes, ['chk_rec', 'chk_inv', 'chk_res', 'chk_imp', 'chk_seg']);
  });

  it('define phaseName en español chileno consistente', () => {
    assert.deepEqual(
      PROCESS_SECTIONS.map((s) => s.phaseName),
      ['Recepción', 'Investigación', 'Resolución', 'Apelación', 'Seguimiento'],
    );
  });

  it('los títulos numeran las 5 secciones', () => {
    for (const section of PROCESS_SECTIONS) {
      assert.match(section.title, /^[1-5]\.\s/);
    }
  });
});
