/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type ReviewAnnotation, updateReviewAnnotationText } from './reviewAnnotationUtils';

const annotations: ReviewAnnotation[] = [
  {
    raw_text: 'Texto original',
    normalized_text: 'texto original',
    type: 'negative',
    page_number: 1,
    sequence_number: 1,
    detected_date: null,
    detected_teacher: null,
    confidence: 0.9,
  },
  {
    raw_text: 'Segunda anotación',
    normalized_text: 'segunda anotacion',
    type: 'positive',
    page_number: 2,
    sequence_number: 2,
    detected_date: null,
    detected_teacher: null,
    confidence: 0.8,
  },
];

describe('updateReviewAnnotationText', () => {
  it('actualiza solamente la anotación seleccionada', () => {
    const result = updateReviewAnnotationText(annotations, 1, '  Texto corregido  ');

    assert.equal(result[0]?.raw_text, 'Texto corregido');
    assert.deepEqual(result[1], annotations[1]);
  });

  it('invalida el texto normalizado para que el backend lo regenere', () => {
    const result = updateReviewAnnotationText(annotations, 1, 'Texto corregido');

    assert.equal(result[0]?.normalized_text, undefined);
  });

  it('no muta el arreglo original', () => {
    updateReviewAnnotationText(annotations, 1, 'Texto corregido');

    assert.equal(annotations[0]?.raw_text, 'Texto original');
    assert.equal(annotations[0]?.normalized_text, 'texto original');
  });
});
