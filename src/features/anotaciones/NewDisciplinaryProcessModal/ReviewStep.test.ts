/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, expect, it } from 'vitest';
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

    expect(result[0]?.raw_text).toBe('Texto corregido');
    expect(result[1]).toEqual(annotations[1]);
  });

  it('invalida el texto normalizado para que el backend lo regenere', () => {
    const result = updateReviewAnnotationText(annotations, 1, 'Texto corregido');

    expect(result[0]?.normalized_text).toBeUndefined();
  });

  it('no muta el arreglo original', () => {
    updateReviewAnnotationText(annotations, 1, 'Texto corregido');

    expect(annotations[0]?.raw_text).toBe('Texto original');
    expect(annotations[0]?.normalized_text).toBe('texto original');
  });
});
