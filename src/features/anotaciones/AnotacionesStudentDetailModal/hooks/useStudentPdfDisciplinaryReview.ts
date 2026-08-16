/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/shared/api/lib/supabase';
import { useAuthStore } from '@/shared/lib/stores/authStore';
import { useInvalidateDashboardQueries } from '@/shared/lib/hooks/useInvalidateDashboardQueries';
import type { AnnotationSummary } from '@/shared/lib/types';
import {
  deleteDisciplinaryFile,
  type UploadedDisciplinaryFile,
  uploadDisciplinaryFile,
} from '@/shared/api/services/disciplinary-storage.service';
import type {
  ReviewAnnotation,
  ReviewAnnotationType,
} from '../../NewDisciplinaryProcessModal/ReviewStep';
import { updateReviewAnnotationText } from '../../NewDisciplinaryProcessModal/reviewAnnotationUtils';
import {
  buildReviewComparison,
  summaryFromAnnotations,
  type AnalysisResponse,
  type ConfirmationResponse,
  type ReviewComparison,
} from './pdfReviewLogic';

interface StudentPdfReviewParams {
  studentId: string;
  studentName: string;
  currentNegativeCount: number;
  currentLetterType?: string | null;
  onConfirmed?: () => void | Promise<void>;
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
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'processing' | 'ready' | 'confirming' | 'success' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const invalidateDashboard = useInvalidateDashboardQueries();
  const idempotencyKeyRef = useRef<string | null>(null);
  if (idempotencyKeyRef.current === null) idempotencyKeyRef.current = crypto.randomUUID();
  const abortRef = useRef<AbortController | null>(null);
  const analysisRunRef = useRef(0);

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
    idempotencyKeyRef.current = crypto.randomUUID();
  }, [cleanupDraft]);

  const comparison = useMemo<ReviewComparison | null>(
    () =>
      buildReviewComparison({
        analysis,
        summary,
        studentId,
        studentName,
        currentNegativeCount,
        currentLetterType,
      }),
    [analysis, currentLetterType, currentNegativeCount, studentId, studentName, summary],
  );

  const analyzeFile = useCallback(
    async (nextFile: File) => {
      const runId = analysisRunRef.current + 1;
      analysisRunRef.current = runId;
      const tenantId = useAuthStore.getState().tenantId;
      if (!tenantId) {
        setErrorMessage('No se pudo resolver el establecimiento activo del usuario.');
        setStatus('error');
        return;
      }

      await cleanupDraft();
      if (analysisRunRef.current !== runId) return;
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
        if (analysisRunRef.current !== runId || controller.signal.aborted) {
          if (uploaded?.storagePath) await deleteDisciplinaryFile(uploaded.storagePath);
          return;
        }
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

        if (analysisRunRef.current !== runId || controller.signal.aborted) return;
        const data = (await response.json()) as AnalysisResponse;
        setAnalysis(data);
        setAnnotations(data.annotations || []);
        setSummary(data.summary);
        setStatus('ready');
        setStatusMessage('Análisis listo para revisión. Nada se ha confirmado todavía.');
      } catch (error) {
        if (analysisRunRef.current !== runId) return;
        if ((error as Error)?.name === 'AbortError') {
          setErrorMessage('Análisis cancelado.');
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Error al analizar el PDF.');
        }
        setStatus('error');
        setStatusMessage('Error al procesar el PDF.');
      } finally {
        if (analysisRunRef.current === runId) abortRef.current = null;
      }
    },
    [cleanupDraft, studentId],
  );

  const handleAnnotationTypeChange = useCallback(
    (sequenceNumber: number, type: ReviewAnnotationType) => {
      const next = annotations.map((annotation) =>
        annotation.sequence_number === sequenceNumber ? { ...annotation, type } : annotation,
      );
      setAnnotations(next);
      setSummary(summaryFromAnnotations(next));
    },
    [annotations],
  );

  const handleAnnotationTextChange = useCallback((sequenceNumber: number, text: string) => {
    setAnnotations((current) => updateReviewAnnotationText(current, sequenceNumber, text));
  }, []);

  const confirmReview = useCallback(async () => {
    const tenantId = useAuthStore.getState().tenantId;
    if (!tenantId || !uploadedFile || !analysis || !file || !summary) {
      setErrorMessage('Faltan datos para confirmar la actualización.');
      return false;
    }
    if (comparison?.conflictMessage) {
      setErrorMessage(
        'El PDF detecta un estudiante distinto. Revisa el archivo antes de confirmar.',
      );
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
          suggestedLetterType:
            comparison?.suggestedDocType || analysis.recommended_letter_type || 'none',
          annotations,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error del servidor (${response.status})`);
      }

      const confirmation = (await response.json()) as ConfirmationResponse;
      const inserted = confirmation.insertedAnnotations;
      const insertedTotal = inserted.negativas + inserted.positivas + inserted.informativas;
      setStatus('success');
      setStatusMessage(
        insertedTotal === 0
          ? 'Actualización confirmada. No se encontraron anotaciones nuevas para agregar.'
          : `Actualización confirmada. Se agregaron ${insertedTotal} anotación${insertedTotal === 1 ? '' : 'es'} nueva${insertedTotal === 1 ? '' : 's'}.`,
      );
      setUploadedFile(null);
      await Promise.all([onConfirmed?.(), invalidateDashboard()]);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al confirmar actualización.');
      setStatus('error');
      setStatusMessage('Error al confirmar.');
      return false;
    }
  }, [
    analysis,
    annotations,
    comparison,
    file,
    invalidateDashboard,
    onConfirmed,
    studentId,
    summary,
    uploadedFile,
  ]);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const nextFile = event.dataTransfer.files[0];
      if (nextFile) await analyzeFile(nextFile);
    },
    [analyzeFile],
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextFile = event.target.files?.[0];
      if (nextFile) await analyzeFile(nextFile);
      event.target.value = '';
    },
    [analyzeFile],
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
    handleAnnotationTextChange,
    confirmReview,
    reset,
  };
}
