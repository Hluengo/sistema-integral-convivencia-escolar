/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Lógica pura de la revisión disciplinaria de PDFs: tipos de respuesta del
 * servidor, resumen de anotaciones y comparación con los registros actuales.
 * Separada del hook para poder testearla sin montar React.
 */

import type { AnnotationSummary } from '@/shared/lib/types';
import type { ReviewAnnotation } from '../../NewDisciplinaryProcessModal/ReviewStep';
import {
  getSuggestedLetterType,
  mapDocTypeToLetterType,
  mapLetterTypeToDocType,
  type LetterDocType,
} from '@/shared/lib/domain/disciplinaryStage';

export interface StudentCandidate {
  id: string;
  full_name: string;
  rut: string | null;
  course_id: string | null;
  course_name: string | null;
  confidence: number;
}

export interface AnalysisResponse {
  success: true;
  analysis_id: string | null;
  file_id: string | null;
  selected_student_id: string | null;
  detected_student_name: string | null;
  detected_course: string | null;
  student_candidates: StudentCandidate[];
  summary: AnnotationSummary;
  annotations: ReviewAnnotation[];
  recommended_letter_type: string;
  warnings: string[];
  processing_status: string;
  file_hash: string;
}

export interface ConfirmationResponse {
  success: true;
  insertedAnnotations: AnnotationSummary;
}

export interface ReviewComparison {
  registeredNegativeCount: number;
  detectedNegativeCount: number;
  difference: number;
  possibleNewAnnotations: number;
  currentLetterType: string | null;
  suggestedDocType: LetterDocType | null;
  suggestedLetterType: string | null;
  recommendation: 'mantener' | 'escalar' | 'derivar' | 'revisar_conflicto';
  conflictMessage: string | null;
}

export function summaryFromAnnotations(annotations: ReviewAnnotation[]): AnnotationSummary {
  return annotations.reduce(
    (acc, annotation) => {
      if (annotation.type === 'negative') acc.negativas += 1;
      if (annotation.type === 'positive') acc.positivas += 1;
      if (annotation.type === 'information') acc.informativas += 1;
      return acc;
    },
    { negativas: 0, positivas: 0, informativas: 0 },
  );
}

interface ReviewComparisonInput {
  analysis: AnalysisResponse | null;
  summary: AnnotationSummary | null;
  studentId: string;
  studentName: string;
  currentNegativeCount: number;
  currentLetterType?: string | null;
}

/** Compara lo registrado con lo detectado para recomendar la siguiente acción. */
export function buildReviewComparison({
  analysis,
  summary,
  studentId,
  studentName,
  currentNegativeCount,
  currentLetterType,
}: ReviewComparisonInput): ReviewComparison | null {
  if (!summary) return null;
  const detectedNegativeCount = summary.negativas;
  const effectiveNegativeCount = Math.max(currentNegativeCount, detectedNegativeCount);
  const suggestedDocType = getSuggestedLetterType(effectiveNegativeCount, currentLetterType);
  const suggestedLetterType = mapDocTypeToLetterType(suggestedDocType);
  const detectedOtherStudent =
    analysis?.selected_student_id && analysis.selected_student_id !== studentId
      ? analysis.student_candidates.find(
          (candidate) => candidate.id === analysis.selected_student_id,
        )
      : null;
  const nameConflict =
    analysis?.detected_student_name &&
    !analysis.detected_student_name
      .toLowerCase()
      .includes(studentName.split(' ')[0].toLowerCase()) &&
    !studentName.toLowerCase().includes(analysis.detected_student_name.split(' ')[0].toLowerCase());
  const conflictMessage = detectedOtherStudent
    ? `El PDF parece corresponder a ${detectedOtherStudent.full_name}.`
    : nameConflict
      ? `Nombre detectado en PDF: ${analysis?.detected_student_name}.`
      : null;
  const currentDocType = mapLetterTypeToDocType(currentLetterType);
  const recommendation = conflictMessage
    ? 'revisar_conflicto'
    : suggestedDocType === 'derivacion'
      ? 'derivar'
      : suggestedDocType && suggestedDocType !== currentDocType
        ? 'escalar'
        : 'mantener';

  return {
    registeredNegativeCount: currentNegativeCount,
    detectedNegativeCount,
    difference: detectedNegativeCount - currentNegativeCount,
    possibleNewAnnotations: Math.max(0, detectedNegativeCount - currentNegativeCount),
    currentLetterType: currentLetterType || null,
    suggestedDocType,
    suggestedLetterType,
    recommendation,
    conflictMessage,
  };
}
