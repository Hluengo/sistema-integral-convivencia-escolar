/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/shared/api/lib/supabase";
import { useAuthStore } from "@/shared/lib/stores/authStore";
import { useInvalidateDashboardQueries } from "@/shared/lib/hooks/useInvalidateDashboardQueries";
import type { AnnotationSummary } from "@/shared/lib/types";
import {
  deleteDisciplinaryFile,
  type UploadedDisciplinaryFile,
  uploadDisciplinaryFile,
} from "@/shared/api/services/disciplinary-storage.service";
import type {
  ReviewAnnotation,
  ReviewAnnotationType,
} from "../../NewDisciplinaryProcessModal/ReviewStep";
import { updateReviewAnnotationText } from "../../NewDisciplinaryProcessModal/reviewAnnotationUtils";
import {
  buildReviewComparison,
  summaryFromAnnotations,
  type AnalysisResponse,
  type ConfirmationResponse,
  type ReviewComparison,
} from "./pdfReviewLogic";
import { usePdfReviewDraft } from "../../usePdfReviewDraft";
import {
  clearSessionDraft,
  writeSessionDraft,
} from "@/shared/lib/sessionDraft";
import type { PdfReviewDraft } from "../../disciplinaryDraft";

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
  const { draftKey, draft, fileQuery } = usePdfReviewDraft(
    "student-pdf-review",
    studentId,
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] =
    useState<UploadedDisciplinaryFile | null>(draft.uploadedFile);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(
    draft.analysis,
  );
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>(
    draft.annotations,
  );
  const [textDraft, setTextDraft] = useState(draft.textDraft);
  const [summary, setSummary] = useState<AnnotationSummary | null>(
    draft.analysis ? summaryFromAnnotations(draft.annotations) : null,
  );
  const [status, setStatus] = useState<
    | "idle"
    | "uploading"
    | "processing"
    | "ready"
    | "confirming"
    | "success"
    | "error"
  >(draft.analysis ? "ready" : "idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const invalidateDashboard = useInvalidateDashboardQueries();
  const idempotencyKeyRef = useRef(draft.idempotencyKey);
  const confirmedRef = useRef(false);
  const confirmingRef = useRef(false);
  const restoringRef = useRef(Boolean(draft.analysis));
  const abortRef = useRef<AbortController | null>(null);
  const analysisRunRef = useRef(0);

  useEffect(
    () => () => {
      analysisRunRef.current += 1;
      abortRef.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!restoringRef.current) return;
    if (fileQuery.isError) {
      setFile(null);
      setErrorMessage(
        fileQuery.error instanceof Error
          ? fileQuery.error.message
          : "No fue posible reabrir el PDF privado.",
      );
      setStatus("error");
    } else if (fileQuery.data) {
      setFile(fileQuery.data);
      setErrorMessage(null);
      setStatus("ready");
      setStatusMessage(
        "Borrador recuperado y PDF revalidado. Revise antes de confirmar.",
      );
    }
  }, [fileQuery.data, fileQuery.error, fileQuery.isError]);

  const draftValue = useMemo<PdfReviewDraft>(
    () => ({
      ...draft,
      uploadedFile,
      analysis,
      annotations,
      textDraft,
      selectedStudentId: studentId,
      step: analysis ? "review" : "upload",
      idempotencyKey: idempotencyKeyRef.current,
    }),
    [draft, uploadedFile, analysis, annotations, textDraft, studentId],
  );
  useEffect(() => {
    if (!confirmedRef.current && (uploadedFile || analysis))
      writeSessionDraft(draftKey, draftValue);
  }, [analysis, draftKey, draftValue, uploadedFile]);

  const cleanupDraft = useCallback(async () => {
    abortRef.current?.abort();
    // Cambiar de vista o descartar texto no autoriza borrar un PDF que pudo quedar confirmado.
    setUploadedFile(null);
  }, []);

  const reset = useCallback(async () => {
    restoringRef.current = false;
    confirmedRef.current = true;
    analysisRunRef.current += 1;
    clearSessionDraft(draftKey);
    await cleanupDraft();
    setFile(null);
    setAnalysis(null);
    setAnnotations([]);
    setTextDraft({ activeSequenceNumber: null, texts: {} });
    setSummary(null);
    setStatus("idle");
    setStatusMessage("");
    setErrorMessage(null);
    idempotencyKeyRef.current = crypto.randomUUID();
  }, [cleanupDraft, draftKey]);

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
    [
      analysis,
      currentLetterType,
      currentNegativeCount,
      studentId,
      studentName,
      summary,
    ],
  );

  const analyzeFile = useCallback(
    async (nextFile: File) => {
      const runId = analysisRunRef.current + 1;
      analysisRunRef.current = runId;
      const tenantId = useAuthStore.getState().tenantId;
      if (!tenantId) {
        setErrorMessage(
          "No se pudo resolver el establecimiento activo del usuario.",
        );
        setStatus("error");
        return;
      }

      restoringRef.current = false;
      confirmedRef.current = false;
      idempotencyKeyRef.current = crypto.randomUUID();

      await cleanupDraft();
      if (analysisRunRef.current !== runId) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setFile(nextFile);
      setAnalysis(null);
      setAnnotations([]);
      setTextDraft({ activeSequenceNumber: null, texts: {} });
      setSummary(null);
      setErrorMessage(null);
      setStatus("uploading");
      setStatusMessage("Subiendo PDF privado...");

      try {
        const uploaded = await uploadDisciplinaryFile(
          nextFile,
          tenantId,
          studentId,
        );
        if (analysisRunRef.current !== runId || controller.signal.aborted) {
          if (uploaded?.storagePath)
            await deleteDisciplinaryFile(uploaded.storagePath);
          return;
        }
        setUploadedFile(uploaded);
        if (!uploaded) throw new Error("No fue posible subir el PDF.");

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (session?.access_token)
          headers.Authorization = `Bearer ${session.access_token}`;

        setStatus("processing");
        setStatusMessage("Analizando PDF con el flujo disciplinario...");
        const response = await fetch("/api/process-disciplinary-pdf", {
          method: "POST",
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
          throw new Error(
            errorData?.error || `Error del servidor (${response.status})`,
          );
        }

        if (analysisRunRef.current !== runId || controller.signal.aborted)
          return;
        const data = (await response.json()) as AnalysisResponse;
        setAnalysis(data);
        setAnnotations(data.annotations || []);
        setSummary(data.summary);
        setStatus("ready");
        setStatusMessage(
          "Análisis listo para revisión. Nada se ha confirmado todavía.",
        );
      } catch (error) {
        if (analysisRunRef.current !== runId) return;
        if ((error as Error)?.name === "AbortError") {
          setErrorMessage("Análisis cancelado.");
        } else {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Error al analizar el PDF.",
          );
        }
        setStatus("error");
        setStatusMessage("Error al procesar el PDF.");
      } finally {
        if (analysisRunRef.current === runId) abortRef.current = null;
      }
    },
    [cleanupDraft, studentId],
  );

  const handleAnnotationTypeChange = useCallback(
    (sequenceNumber: number, type: ReviewAnnotationType) => {
      const next = annotations.map((annotation) =>
        annotation.sequence_number === sequenceNumber
          ? { ...annotation, type }
          : annotation,
      );
      setAnnotations(next);
      setSummary(summaryFromAnnotations(next));
    },
    [annotations],
  );

  const handleAnnotationTextChange = useCallback(
    (sequenceNumber: number, text: string) => {
      setAnnotations((current) =>
        updateReviewAnnotationText(current, sequenceNumber, text),
      );
    },
    [],
  );

  const confirmReview = useCallback(async () => {
    if (
      confirmedRef.current ||
      confirmingRef.current ||
      Object.keys(textDraft.texts).length > 0
    )
      return false;
    const tenantId = useAuthStore.getState().tenantId;
    if (!tenantId || !uploadedFile || !analysis || !file || !summary) {
      setErrorMessage("Faltan datos para confirmar la actualización.");
      return false;
    }
    if (comparison?.conflictMessage) {
      setErrorMessage(
        "El PDF detecta un estudiante distinto. Revisa el archivo antes de confirmar.",
      );
      return false;
    }

    try {
      confirmingRef.current = true;
      setStatus("confirming");
      setStatusMessage("Confirmando actualización en Supabase...");
      setErrorMessage(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token)
        headers.Authorization = `Bearer ${session.access_token}`;

      const response = await fetch("/api/process-disciplinary-pdf/confirm", {
        method: "POST",
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
            comparison?.suggestedDocType ||
            analysis.recommended_letter_type ||
            "none",
          annotations,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || `Error del servidor (${response.status})`,
        );
      }

      const confirmation = (await response.json()) as ConfirmationResponse;
      const inserted = confirmation.insertedAnnotations;
      const insertedTotal =
        inserted.negativas + inserted.positivas + inserted.informativas;
      confirmedRef.current = true;
      clearSessionDraft(draftKey, JSON.stringify(draftValue));
      setStatus("success");
      setStatusMessage(
        insertedTotal === 0
          ? "Actualización confirmada. No se encontraron anotaciones nuevas para agregar."
          : `Actualización confirmada. Se agregaron ${insertedTotal} anotación${insertedTotal === 1 ? "" : "es"} nueva${insertedTotal === 1 ? "" : "s"}.`,
      );
      setUploadedFile(null);
      setFile(null);
      await Promise.all([onConfirmed?.(), invalidateDashboard()]);
      return true;
    } catch (error) {
      if (confirmedRef.current) {
        setStatus("success");
        setErrorMessage(
          "La actualización fue confirmada, pero no se pudo refrescar la vista. No vuelva a confirmarla; recargue el historial.",
        );
        return true;
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error al confirmar actualización.",
      );
      setStatus("error");
      setStatusMessage("Error al confirmar.");
      return false;
    } finally {
      confirmingRef.current = false;
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
    draftKey,
    draftValue,
    textDraft,
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
      event.target.value = "";
    },
    [analyzeFile],
  );

  return {
    file,
    analysis,
    annotations,
    textDraft,
    setTextDraft,
    summary,
    comparison,
    status,
    statusMessage,
    errorMessage,
    isDragging,
    isBusy:
      fileQuery.isFetching ||
      status === "uploading" ||
      status === "processing" ||
      status === "confirming",
    setIsDragging,
    setErrorMessage,
    handleDrop,
    handleFileSelect,
    handleAnnotationTypeChange,
    handleAnnotationTextChange,
    confirmReview,
    reset,
    canConfirm: Boolean(
      file &&
      uploadedFile &&
      analysis &&
      !confirmedRef.current &&
      Object.keys(textDraft.texts).length === 0 &&
      !comparison?.conflictMessage,
    ),
    canRetryRestore: restoringRef.current && fileQuery.isError,
    retryRestore: () => {
      if (restoringRef.current) void fileQuery.refetch();
    },
  };
}
