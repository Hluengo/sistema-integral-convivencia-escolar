/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import type { AnnotationSummary } from '@/src/shared/lib/types';
import {
  deleteDisciplinaryFile,
  type UploadedDisciplinaryFile,
  uploadDisciplinaryFile,
} from '@/src/shared/api/services/disciplinary-storage.service';
import {
  getSuggestedLetterType,
  mapDocTypeToLetterType,
  mapLetterTypeToDocType,
  type LetterDocType,
} from '@/src/shared/lib/domain/disciplinaryStage';
import type {
  ReviewAnnotation,
  ReviewAnnotationType,
} from '../../NewDisciplinaryProcessModal/ReviewStep';

interface StudentPdfReviewParams {
  studentId: string;
  studentName: string;
  currentNegativeCount: number;
  currentLetterType?: string | null;
  onConfirmed?: () => void | Promise<void>;
}

interface StudentCandidate {
  id: string;
  full_name: string;
  rut: string | null;
  course_id: string | null;
  course_name: string | null;
  confidence: number;
}

interface AnalysisResponse {
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

interface ReviewComparison {
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

function summaryFromAnnotations(annotations: ReviewAnnotation[]): AnnotationSummary {
  return annotations.reduce(
    (acc, annotation) => {
      if (annotation.type === 'negative') acc.negativas += 1;
      if (annotation.type === 'positive') acc.positivas += 1;
      if (annotation.type === 'information') acc.informativas += 1;
      return acc;
    },
    { negativas: 0, positivas: 0, informativas: 0 }
  );
}

export function useStudentPdfDisciplinaryReview({
  studentId,
  studentName,
  currentNegativeCount,
  currentLetterType,
  onConfirmed,
}: StudentPdfReviewParams) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedDisciplinaryFile | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>([]);
  const [summary, setSummary] = useState<AnnotationSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'confirming' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const abortRef = useRef<AbortController | null>(null);

  const cleanupDraft = useCallback(async () => {
    abortRef.current?.abort();
    if (uploadedFile?.storagePath) await deleteDisciplinaryFile(uploadedFile.storagePath);
    setUploadedFile(null);
  }, [uploadedFile]);

  const reset = useCallback(async () => {
    await cleanupDraft();
    setFile(null);
    setAnalysis(null);
    setAnnotations([]);
    setSummary(null);
    setStatus('idle');
    setStatusMessage('');
    setErrorMessage(null);
    setIdempotencyKey(crypto.randomUUID());
  }, [cleanupDraft]);

  const comparison = useMemo<ReviewComparison | null>(() => {
    if (!summary) return null;
    const detectedNegativeCount = summary.negativas;
    const effectiveNegativeCount = Math.max(currentNegativeCount, detectedNegativeCount);
    const suggestedDocType = getSuggestedLetterType(effectiveNegativeCount, currentLetterType);
    const suggestedLetterType = mapDocTypeToLetterType(suggestedDocType);
    const detectedOtherStudent =
      analysis?.selected_student_id && analysis.selected_student_id !== studentId
        ? analysis.student_candidates.find((candidate) => candidate.id === analysis.selected_student_id)
        : null;
    const nameConflict =
      analysis?.detected_student_name &&
      !analysis.detected_student_name.toLowerCase().includes(studentName.split(' ')[0].toLowerCase()) &&
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
  }, [analysis, currentLetterType, currentNegativeCount, studentId, studentName, summary]);

  const analyzeFile = useCallback(
    async (nextFile: File) => {
      const tenantId = useAuthStore.getState().tenantId;
      if (!tenantId) {
        setErrorMessage('No se pudo resolver el establecimiento activo del usuario.');
        setStatus('error');
        return;
      }

      await cleanupDraft();
      const controller = new AbortController();
      abortRef.current = controller;
      setFile(nextFile);
      setAnalysis(null);
      setAnnotations([]);
      setSummary(null);
      setErrorMessage(null);
      setStatus('uploading');
      setStatusMessage('Subiendo PDF privado...');

      try {
        const uploaded = await uploadDisciplinaryFile(nextFile, tenantId, studentId);
        setUploadedFile(uploaded);
        if (!uploaded) throw new Error('No fue posible subir el PDF.');

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        setStatus('processing');
        setStatusMessage('Analizando PDF con el flujo disciplinario...');
        const response = await fetch('/api/process-disciplinary-pdf', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            bucket: uploaded.bucket,
            storagePath: uploaded.storagePath,
            fileName: uploaded.originalName,
            tenantId,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `Error del servidor (${response.status})`);
        }

        const data = (await response.json()) as AnalysisResponse;
        setAnalysis(data);
        setAnnotations(data.annotations || []);
        setSummary(data.summary);
        setStatus('ready');
        setStatusMessage('Análisis listo para revisión. Nada se ha confirmado todavía.');
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          setErrorMessage('Análisis cancelado.');
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Error al analizar el PDF.');
        }
        setStatus('error');
        setStatusMessage('Error al procesar el PDF.');
      } finally {
        abortRef.current = null;
      }
    },
    [cleanupDraft, studentId]
  );

  const handleAnnotationTypeChange = useCallback(
    (sequenceNumber: number, type: ReviewAnnotationType) => {
      const next = annotations.map((annotation) =>
        annotation.sequence_number === sequenceNumber ? { ...annotation, type } : annotation
      );
      setAnnotations(next);
      setSummary(summaryFromAnnotations(next));
    },
    [annotations]
  );

  const confirmReview = useCallback(async () => {
    const tenantId = useAuthStore.getState().tenantId;
    if (!tenantId || !uploadedFile || !analysis || !file || !summary) {
      setErrorMessage('Faltan datos para confirmar la actualización.');
      return false;
    }
    if (comparison?.conflictMessage) {
      setErrorMessage('El PDF detecta un estudiante distinto. Revisa el archivo antes de confirmar.');
      return false;
    }

    try {
      setStatus('confirming');
      setStatusMessage('Confirmando actualización en Supabase...');
      setErrorMessage(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const response = await fetch('/api/process-disciplinary-pdf/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          analysisId: analysis.analysis_id,
          fileId: analysis.file_id,
          bucket: uploadedFile.bucket,
          storagePath: uploadedFile.storagePath,
          fileName: uploadedFile.originalName,
          fileHash: analysis.file_hash,
          fileSize: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          tenantId,
          studentId,
          suggestedLetterType: comparison?.suggestedDocType || analysis.recommended_letter_type || 'none',
          annotations,
          idempotencyKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error del servidor (${response.status})`);
      }

      setStatus('success');
      setStatusMessage('Actualización confirmada.');
      setUploadedFile(null);
      await onConfirmed?.();
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al confirmar actualización.');
      setStatus('error');
      setStatusMessage('Error al confirmar.');
      return false;
    }
  }, [analysis, annotations, comparison, file, idempotencyKey, onConfirmed, studentId, summary, uploadedFile]);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const nextFile = event.dataTransfer.files[0];
      if (nextFile) await analyzeFile(nextFile);
    },
    [analyzeFile]
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0];
      if (nextFile) await analyzeFile(nextFile);
      event.target.value = '';
    },
    [analyzeFile]
  );

  return {
    file,
    analysis,
    annotations,
    summary,
    comparison,
    status,
    statusMessage,
    errorMessage,
    isDragging,
    isBusy: status === 'uploading' || status === 'processing' || status === 'confirming',
    setIsDragging,
    setErrorMessage,
    handleDrop,
    handleFileSelect,
    handleAnnotationTypeChange,
    confirmReview,
    reset,
  };
}