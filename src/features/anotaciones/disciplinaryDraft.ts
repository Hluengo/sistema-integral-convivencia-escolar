/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from "zod";
import type { UploadedDisciplinaryFile } from "@/shared/api/services/disciplinary-storage.service";

const reviewAnnotationSchema = z.object({
  raw_text: z.string(),
  normalized_text: z.string().optional(),
  type: z.enum(["negative", "positive", "information"]),
  page_number: z.number().nullable(),
  sequence_number: z.number().int(),
  detected_date: z.string().nullable(),
  detected_teacher: z.string().nullable(),
  confidence: z.number(),
});
const studentCandidateSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  rut: z.string().nullable(),
  course_id: z.string().nullable(),
  course_name: z.string().nullable(),
  confidence: z.number(),
});
export const pdfAnalysisSchema = z.object({
  success: z.literal(true),
  analysis_id: z.string().nullable(),
  file_id: z.string().nullable(),
  selected_student_id: z.string().nullable(),
  detected_student_name: z.string().nullable(),
  detected_course: z.string().nullable(),
  student_candidates: z.array(studentCandidateSchema),
  annotations: z.array(reviewAnnotationSchema),
  summary: z.object({
    negativas: z.number().nonnegative(),
    positivas: z.number().nonnegative(),
    informativas: z.number().nonnegative(),
  }),
  recommended_letter_type: z.string(),
  warnings: z.array(z.string()),
  processing_status: z.string(),
  file_hash: z.string().regex(/^[a-f0-9]{64}$/),
  analyzed_at: z.string().optional(),
  duplicate_file: z
    .object({
      process_id: z.string(),
      process_number: z.string(),
      student_id: z.string().nullable(),
      uploaded_at: z.string(),
    })
    .nullable()
    .optional(),
});
const uploadedFileSchema: z.ZodType<UploadedDisciplinaryFile> = z.object({
  bucket: z.literal("disciplinary-processes"),
  storagePath: z.string(),
  originalName: z.string(),
  storedName: z.string(),
  mimeType: z.literal("application/pdf"),
  size: z.number().int().positive(),
});
const pdfReviewDraftValuesSchema = z.object({
  uploadedFile: uploadedFileSchema.nullable(),
  analysis: pdfAnalysisSchema.nullable(),
  annotations: z.array(reviewAnnotationSchema),
  idempotencyKey: z.uuid(),
  textDraft: z.object({
    activeSequenceNumber: z.number().int().nullable(),
    texts: z.record(z.string(), z.string()),
  }),
  step: z.enum([
    "upload",
    "student_resolution",
    "duplicate_check",
    "classification",
    "review",
  ]),
  selectedStudentId: z.string().nullable(),
  course: z.string().nullable(),
  classification: z.string(),
});
export const pdfReviewDraftSchema = pdfReviewDraftValuesSchema.partial();
export type PdfReviewDraft = z.infer<typeof pdfReviewDraftValuesSchema>;
export type AnalysisResponse = z.infer<typeof pdfAnalysisSchema>;
export type StudentCandidate = z.infer<typeof studentCandidateSchema>;

export function createPdfReviewDraft(): PdfReviewDraft {
  return {
    uploadedFile: null,
    analysis: null,
    annotations: [],
    textDraft: { activeSequenceNumber: null, texts: {} },
    idempotencyKey: crypto.randomUUID(),
    step: "upload",
    selectedStudentId: null,
    course: null,
    classification: "",
  };
}
