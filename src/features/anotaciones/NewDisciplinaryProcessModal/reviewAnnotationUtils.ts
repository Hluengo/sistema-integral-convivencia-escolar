/** @license SPDX-License-Identifier: Apache-2.0 */

export type ReviewAnnotationType = 'negative' | 'positive' | 'information';

export interface ReviewAnnotation {
  raw_text: string;
  normalized_text?: string;
  type: ReviewAnnotationType;
  page_number: number | null;
  sequence_number: number;
  detected_date: string | null;
  detected_teacher: string | null;
  confidence: number;
}

export function updateReviewAnnotationText(
  annotations: ReviewAnnotation[],
  sequenceNumber: number,
  text: string,
): ReviewAnnotation[] {
  const nextText = text.trim();
  return annotations.map((annotation) =>
    annotation.sequence_number === sequenceNumber
      ? { ...annotation, raw_text: nextText, normalized_text: undefined }
      : annotation,
  );
}
