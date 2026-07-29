/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countAnnotationStages, parseAnnotationStageRows } from './annotationStageCounts';

describe('annotationStageCounts', () => {
  it('cuenta Sin Carta solamente entre 1 y 4 anotaciones negativas', () => {
    const counts = countAnnotationStages(
      [0, 1, 4, 5, 9, 10, 14, 15].map((annotations_count) => ({ annotations_count })),
    );

    assert.deepEqual(counts, {
      sinCarta: { total: 2, pending: 2, processed: 0 },
      amonestacion: { total: 2, pending: 2, processed: 0 },
      compromiso: { total: 2, pending: 2, processed: 0 },
      derivacion: { total: 1, pending: 1, processed: 0 },
    });
  });

  it('interpreta el desglose pendiente y procesado de la RPC', () => {
    assert.deepEqual(
      parseAnnotationStageRows([
        { stage: 'sin_carta', total_count: '3', pending_count: 3, processed_count: 0 },
        { stage: 'amonestacion', total_count: 2, pending_count: 1, processed_count: 1 },
        { stage: 'compromiso', total_count: 1, pending_count: 1, processed_count: 0 },
        { stage: 'derivacion', total_count: 9, pending_count: 1, processed_count: 8 },
      ]),
      {
        sinCarta: { total: 3, pending: 3, processed: 0 },
        amonestacion: { total: 2, pending: 1, processed: 1 },
        compromiso: { total: 1, pending: 1, processed: 0 },
        derivacion: { total: 9, pending: 1, processed: 8 },
      },
    );
  });

  it('clasifica como procesada una carta completada del tramo efectivo', () => {
    const counts = countAnnotationStages([
      { annotations_count: 6, effective_letter_type: 'Amonestación Escrita' },
      { annotations_count: 16, effective_letter_type: 'Carta de Compromiso Conductual' },
      { annotations_count: 3, effective_letter_type: 'Ficha de Derivación' },
    ]);

    assert.deepEqual(counts.amonestacion, { total: 1, pending: 0, processed: 1 });
    assert.deepEqual(counts.derivacion, { total: 2, pending: 1, processed: 1 });
  });
});
