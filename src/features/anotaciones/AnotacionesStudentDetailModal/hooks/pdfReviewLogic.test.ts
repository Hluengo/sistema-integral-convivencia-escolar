/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReviewComparison,
  summaryFromAnnotations,
  type AnalysisResponse,
} from './pdfReviewLogic';
import type { ReviewAnnotation } from '../../NewDisciplinaryProcessModal/ReviewStep';

function makeAnnotation(type: ReviewAnnotation['type']): ReviewAnnotation {
  return {
    sequence_number: 1,
    raw_text: 'Texto de ejemplo',
    type,
    page_number: null,
    detected_date: null,
    detected_teacher: null,
    confidence: 0.9,
  };
}

function makeAnalysis(overrides: Partial<AnalysisResponse> = {}): AnalysisResponse {
  return {
    success: true,
    analysis_id: 'an-1',
    file_id: 'file-1',
    selected_student_id: 's1',
    detected_student_name: 'Valentina Rojas',
    detected_course: '4°A',
    student_candidates: [
      {
        id: 's1',
        full_name: 'Valentina Rojas',
        rut: '12.345.678-9',
        course_id: 'c1',
        course_name: '4°A',
        confidence: 0.95,
      },
    ],
    summary: { negativas: 3, positivas: 0, informativas: 0 },
    annotations: [],
    recommended_letter_type: 'amonestacion',
    warnings: [],
    processing_status: 'completed',
    file_hash: 'abc123',
    ...overrides,
  };
}

describe('pdfReviewLogic', () => {
  it('resume anotaciones por tipo', () => {
    const annotations = [
      makeAnnotation('negative'),
      makeAnnotation('positive'),
      makeAnnotation('information'),
      makeAnnotation('negative'),
    ];
    assert.deepEqual(summaryFromAnnotations(annotations), {
      negativas: 2,
      positivas: 1,
      informativas: 1,
    });
  });

  it('resume listas vacías en ceros', () => {
    assert.deepEqual(summaryFromAnnotations([]), {
      negativas: 0,
      positivas: 0,
      informativas: 0,
    });
  });

  it('retorna null sin resumen', () => {
    assert.equal(
      buildReviewComparison({
        analysis: null,
        summary: null,
        studentId: 's1',
        studentName: 'Valentina Rojas',
        currentNegativeCount: 1,
      }),
      null,
    );
  });

  it('detecta el conflicto cuando el PDF corresponde a otro estudiante', () => {
    const analysis = makeAnalysis({
      selected_student_id: 's2',
      student_candidates: [
        {
          id: 's2',
          full_name: 'Otra Estudiante',
          rut: null,
          course_id: null,
          course_name: null,
          confidence: 0.9,
        },
      ],
    });
    const comparison = buildReviewComparison({
      analysis,
      summary: analysis.summary,
      studentId: 's1',
      studentName: 'Valentina Rojas',
      currentNegativeCount: 1,
    });
    assert.equal(comparison?.recommendation, 'revisar_conflicto');
    assert.match(comparison?.conflictMessage ?? '', /Otra Estudiante/);
  });

  it('detecta conflicto por nombre detectado distinto', () => {
    const analysis = makeAnalysis({
      selected_student_id: null,
      detected_student_name: 'Camila Soto',
    });
    const comparison = buildReviewComparison({
      analysis,
      summary: analysis.summary,
      studentId: 's1',
      studentName: 'Valentina Rojas',
      currentNegativeCount: 1,
    });
    assert.equal(comparison?.recommendation, 'revisar_conflicto');
    assert.match(comparison?.conflictMessage ?? '', /Camila Soto/);
  });

  it('recomienda escalar cuando el conteo supera la carta actual', () => {
    const comparison = buildReviewComparison({
      analysis: makeAnalysis(),
      summary: { negativas: 5, positivas: 0, informativas: 0 },
      studentId: 's1',
      studentName: 'Valentina Rojas',
      currentNegativeCount: 2,
      currentLetterType: 'amonestacion',
    });
    assert.equal(comparison?.recommendation, 'escalar');
    assert.equal(comparison?.possibleNewAnnotations, 3);
  });

  it('recomienda mantener cuando no hay cambios relevantes', () => {
    const comparison = buildReviewComparison({
      analysis: makeAnalysis(),
      summary: { negativas: 2, positivas: 0, informativas: 0 },
      studentId: 's1',
      studentName: 'Valentina Rojas',
      currentNegativeCount: 2,
      currentLetterType: 'amonestacion',
    });
    assert.equal(comparison?.recommendation, 'mantener');
    assert.equal(comparison?.difference, 0);
  });
});
