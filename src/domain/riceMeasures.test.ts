/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRiceMeasureByCount, RICE_MEASURES } from './riceMeasures';

describe('getRiceMeasureByCount', () => {
  it('returns undefined for low counts', () => {
    assert.equal(getRiceMeasureByCount(0), undefined);
    assert.equal(getRiceMeasureByCount(4), undefined);
  });

  it('returns amonestacion for 5-9', () => {
    const result = getRiceMeasureByCount(5);
    assert.equal(result?.etapa, 'amonestacion');
    assert.equal(result?.medida, 'Carta de Amonestación');
  });

  it('returns compromiso for 10-14', () => {
    const result = getRiceMeasureByCount(10);
    assert.equal(result?.etapa, 'compromiso');
    assert.equal(result?.medida, 'Carta de Compromiso');
  });

  it('returns derivacion for 15+', () => {
    const result = getRiceMeasureByCount(15);
    assert.equal(result?.etapa, 'derivacion');
    assert.equal(result?.medida, 'Derivación a Consejo Escolar');
  });
});

describe('RICE_MEASURES', () => {
  it('has 3 defined stages', () => {
    assert.equal(RICE_MEASURES.length, 3);
  });

  it('each has required fields', () => {
    for (const m of RICE_MEASURES) {
      assert.ok(m.id);
      assert.ok(m.medida);
      assert.ok(m.descripcion);
      assert.ok(m.baseLegal);
      assert.ok(m.plazo);
    }
  });
});
