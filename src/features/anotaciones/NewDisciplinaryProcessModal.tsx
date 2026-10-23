/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileWarning,
  History,
  Loader2,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Student } from "./NewDisciplinaryProcessModal/constants";
import { useInvalidateDashboardQueries } from "@/shared/lib/hooks/useInvalidateDashboardQueries";
import { queryClient } from "@/src/lib/queryClient";
import { supabase } from "../../shared/api/lib/supabase";
import { useAuthStore } from "@/shared/lib/stores/authStore";
import type { AnnotationSummary } from "@/shared/lib/types";
import type { DocumentAnalysis } from "@/shared/lib/types";
import { fetchDisciplinaryRules } from "@/shared/api/services/disciplinary-rules.service";
import { fetchDocumentAnalyses } from "@/shared/api/services/annotations.service";
import type { DisciplinaryRule } from "@/shared/api/services/disciplinary-rules.service";
import {
  deleteDisciplinaryFile,
  type UploadedDisciplinaryFile,
  uploadDisciplinaryFile,
} from "@/shared/api/services/disciplinary-storage.service";
import StudentSelectStep from "./NewDisciplinaryProcessModal/StudentSelectStep";
import UploadAnalyzeStep from "./NewDisciplinaryProcessModal/UploadAnalyzeStep";
import ClassificationStep from "./NewDisciplinaryProcessModal/ClassificationStep";
import ReviewStep, {
  type ReviewAnnotation,
  type ReviewAnnotationType,
} from "./NewDisciplinaryProcessModal/ReviewStep";
import { updateReviewAnnotationText } from "./NewDisciplinaryProcessModal/reviewAnnotationUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui/Dialog";
import PdfAnalysisComparison from "./NewDisciplinaryProcessModal/PdfAnalysisComparison";
import Button from "@/shared/ui/Button";
import { usePdfReviewDraft } from "./usePdfReviewDraft";
import {
  clearSessionDraft,
  writeSessionDraft,
} from "@/shared/lib/sessionDraft";
import { summaryFromAnnotations } from "./AnotacionesStudentDetailModal/hooks/pdfReviewLogic";
import type { AnalysisResponse, PdfReviewDraft } from "./disciplinaryDraft";

type FlowStep =
  | "upload"
  | "student_resolution"
  | "duplicate_check"
  | "classification"
  | "review"
  | "success";
type ProcessingState =
  | "idle"
  | "validating"
  | "uploading"
  | "processing"
  | "student_resolution"
  | "review"
  | "confirming"
  | "success"
  | "error";

interface ProcessResult {
  suggestedLetterType?: string;
  studentId?: string;
  processId?: string;
  processNumber?: string;
  summary?: AnnotationSummary;
}

interface StudentCandidate {
  id: string;
  full_name: string;
  rut: string | null;
  course_id: string | null;
  course_name: string | null;
  confidence: number;
}

interface NewDisciplinaryProcessModalProps {
  students: Student[];
  onClose: () => void;
  currentUserEmail: string;
  onProcessCreated?: (result?: ProcessResult) => void | Promise<void>;
  onOpenExistingStudent?: (studentId: string) => void;
}

const STEP_LABELS: Record<FlowStep, string> = {
  upload: "Documento",
  student_resolution: "Estudiante",
  duplicate_check: "Verificación",
  classification: "Carta",
  review: "Revisión",
  success: "Éxito",
};

const STEP_ORDER: FlowStep[] = [
  "upload",
  "student_resolution",
  "duplicate_check",
  "classification",
  "review",
  "success",
];

function matchLocalStudent(
  students: Student[],
  candidate: StudentCandidate,
): Student {
  const local = students.find((student) => student.id === candidate.id);
  if (local) return local;
  return {
    id: candidate.id,
    full_name: candidate.full_name,
    rut: candidate.rut ?? undefined,
    course_id: candidate.course_id ?? "",
    course_name: candidate.course_name ?? undefined,
    teacher_id: "",
  };
}

const LETTER_TYPE_LABELS: Record<string, string> = {
  none: "Sin carta",
  amonestacion: "Amonestación Escrita",
  compromiso: "Carta de Compromiso Conductual",
  compromiso_conductual: "Carta de Compromiso Conductual",
  derivacion: "Derivación a Convivencia Escolar",
};

function getStatusLabel(status: ProcessingState): string {
  switch (status) {
    case "validating":
      return "Validando archivo...";
    case "uploading":
      return "Subiendo PDF privado...";
    case "processing":
      return "Analizando en backend...";
    case "confirming":
      return "Confirmando proceso...";
    default:
      return "Analizando...";
  }
}

export default function NewDisciplinaryProcessModal({
  students,
  onClose,
  currentUserEmail: _currentUserEmail,
  onProcessCreated,
  onOpenExistingStudent,
}: NewDisciplinaryProcessModalProps) {
  const invalidateDashboard = useInvalidateDashboardQueries();
  const tenantId = useAuthStore((state) => state.tenantId);
  const { draftKey, draft, fileQuery } = usePdfReviewDraft(
    "new-disciplinary-process",
  );
  const [step, setStep] = useState<FlowStep>(draft.step);
  const [status, setStatus] = useState<ProcessingState>(
    draft.analysis ? "review" : "idle",
  );
  const [course, setCourse] = useState<string | null>(draft.course);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    () =>
      students.find((student) => student.id === draft.selectedStudentId) ??
      null,
  );
  const [studentCandidates, setStudentCandidates] = useState<Student[]>(() =>
    (draft.analysis?.student_candidates ?? []).map((candidate) =>
      matchLocalStudent(students, candidate),
    ),
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] =
    useState<UploadedDisciplinaryFile | null>(draft.uploadedFile);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(
    draft.analysis,
  );
  const [previousAnalysis, setPreviousAnalysis] =
    useState<DocumentAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnnotationSummary | null>(
    draft.analysis ? summaryFromAnnotations(draft.annotations) : null,
  );
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>(
    draft.annotations,
  );
  const [textDraft, setTextDraft] = useState(draft.textDraft);
  const [suggestedType, setSuggestedType] = useState<string | null>(
    draft.analysis?.recommended_letter_type ?? null,
  );
  const [classification, setClassification] = useState(draft.classification);
  const [createdProcess, setCreatedProcess] = useState<{
    id: string;
    number: string;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idempotencyKeyRef = useRef(draft.idempotencyKey);
  const confirmedRef = useRef(false);
  const confirmingRef = useRef(false);
  const restoringRef = useRef(Boolean(draft.analysis));

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!restoringRef.current) return;
    if (fileQuery.isError) {
      setFile(null);
      setAnalysisError(
        fileQuery.error instanceof Error
          ? fileQuery.error.message
          : "No fue posible reabrir el PDF privado.",
      );
      setStatus("error");
    } else if (fileQuery.data) {
      setFile(fileQuery.data);
      setAnalysisError(null);
      setStatus("review");
    }
  }, [fileQuery.data, fileQuery.error, fileQuery.isError]);
  const draftValue = useMemo<PdfReviewDraft>(
    () => ({
      uploadedFile,
      analysis,
      annotations,
      textDraft,
      idempotencyKey: idempotencyKeyRef.current,
      step: step === "success" ? "review" : step,
      selectedStudentId: selectedStudent?.id ?? null,
      course,
      classification,
    }),
    [
      uploadedFile,
      analysis,
      annotations,
      textDraft,
      step,
      selectedStudent?.id,
      course,
      classification,
    ],
  );
  useEffect(() => {
    if (!confirmedRef.current && (uploadedFile || analysis || classification))
      writeSessionDraft(draftKey, draftValue);
  }, [analysis, classification, draftKey, draftValue, uploadedFile]);

  const {
    data: rules = [],
    isError: rulesLoadFailed,
    refetch: refetchRules,
  } = useQuery<DisciplinaryRule[]>({
    queryKey: ["disciplinary-rules", tenantId],
    queryFn: () => fetchDisciplinaryRules(tenantId),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const ruleOptions = useMemo(() => {
    if (rules.length === 0) return [];
    const uniqueRules = new Map<string, DisciplinaryRule>();

    rules.forEach((rule) => {
      const existing = uniqueRules.get(rule.suggested_letter_type);
      if (!existing || rule.priority > existing.priority) {
        uniqueRules.set(rule.suggested_letter_type, rule);
      }
    });

    return Array.from(uniqueRules.values())
      .sort((a, b) => b.priority - a.priority)
      .map((rule) => ({
        value: rule.suggested_letter_type,
        label: LETTER_TYPE_LABELS[rule.suggested_letter_type] ?? rule.rule_name,
        desc:
          rule.description ||
          `Negativas: ${rule.min_negativas ?? 0}-${rule.max_negativas ?? "∞"}`,
        legal: `Prioridad ${rule.priority}`,
      }));
  }, [rules]);

  const resetDraftState = () => {
    restoringRef.current = false;
    confirmedRef.current = true;
    clearSessionDraft(draftKey);
    abortRef.current?.abort();
    abortRef.current = null;
    setStep("upload");
    setStatus("idle");
    setCourse(null);
    setSelectedStudent(null);
    setStudentCandidates([]);
    setFile(null);
    setUploadedFile(null);
    setAnalysis(null);
    setPreviousAnalysis(null);
    setAnalysisError(null);
    setSummary(null);
    setAnnotations([]);
    setTextDraft({ activeSequenceNumber: null, texts: {} });
    setSuggestedType(null);
    setClassification("");
    setCreatedProcess(null);
    idempotencyKeyRef.current = crypto.randomUUID();
  };

  const availableStudents =
    studentCandidates.length > 0 ? studentCandidates : students;
  const isBusy =
    fileQuery.isFetching ||
    status === "validating" ||
    status === "uploading" ||
    status === "processing" ||
    status === "confirming";
  const currentStepIndex = STEP_ORDER.indexOf(step);
  const duplicateFile = analysis?.duplicate_file ?? null;
  const existingStudentId =
    duplicateFile?.student_id ?? selectedStudent?.id ?? null;
  const existingAnnotationCount = Number(
    selectedStudent?.annotations_count ?? 0,
  );
  const hasExistingStudentRecord = existingAnnotationCount > 0;

  const loadPreviousAnalysis = async (
    studentId: string,
    currentAnalysisId: string | null,
  ) => {
    const analyses = await fetchDocumentAnalyses(studentId);
    const candidates = analyses.filter((item) => item.id !== currentAnalysisId);
    setPreviousAnalysis(
      candidates.find((item) => item.status === "confirmed") ??
        candidates[0] ??
        null,
    );
  };

  const continueAfterDuplicateWarning = () => {
    if (duplicateFile) return;
    setStep("classification");
    setStatus("review");
  };

  const openExistingStudent = async () => {
    if (!existingStudentId || !onOpenExistingStudent) return;
    const studentId = existingStudentId;
    onClose();
    onOpenExistingStudent(studentId);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    if (analysis && uploadedFile) {
      setStep(
        !selectedStudent
          ? "student_resolution"
          : duplicateFile || hasExistingStudentRecord
            ? "duplicate_check"
            : "classification",
      );
      return;
    }
    restoringRef.current = false;
    confirmedRef.current = false;
    const tenantId = useAuthStore.getState().tenantId;
    if (!tenantId) {
      setAnalysisError(
        "No se pudo resolver el establecimiento activo del usuario.",
      );
      setStatus("error");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("validating");
    setAnalysisError(null);
    setAnalysis(null);
    setPreviousAnalysis(null);
    setSummary(null);
    setAnnotations([]);
    setTextDraft({ activeSequenceNumber: null, texts: {} });
    setSelectedStudent(null);
    setStudentCandidates([]);

    try {
      setStatus("uploading");
      const uploaded = await uploadDisciplinaryFile(file, tenantId);
      if (!uploaded) throw new Error("No fue posible subir el PDF.");
      if (controller.signal.aborted) {
        // Cancelado durante la subida: abort() corta la petición, no la subida
        // a Storage, así que hay que borrar el objeto para no dejarlo huérfano.
        await deleteDisciplinaryFile(uploaded.storagePath);
        return;
      }
      setUploadedFile(uploaded);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token)
        headers.Authorization = `Bearer ${session.access_token}`;

      setStatus("processing");
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

      const data = (await response.json()) as AnalysisResponse;
      if (controller.signal.aborted) return;
      setAnalysis(data);
      setSummary(data.summary);
      setAnnotations(data.annotations || []);
      setSuggestedType(data.recommended_letter_type || "none");
      setClassification(
        data.recommended_letter_type && data.recommended_letter_type !== "none"
          ? data.recommended_letter_type
          : "none",
      );

      const candidates = (data.student_candidates || []).map((candidate) =>
        matchLocalStudent(students, candidate),
      );
      setStudentCandidates(candidates);

      const selected = data.selected_student_id
        ? students.find((student) => student.id === data.selected_student_id) ||
          candidates.find(
            (student) => student.id === data.selected_student_id,
          ) ||
          null
        : null;

      if (selected) {
        setSelectedStudent(selected);
        await loadPreviousAnalysis(selected.id, data.analysis_id);
        if (controller.signal.aborted) return;
        setCourse(
          selected.course_name ||
            selected.course_id ||
            data.detected_course ||
            null,
        );
        setStep(
          data.duplicate_file || Number(selected.annotations_count ?? 0) > 0
            ? "duplicate_check"
            : "classification",
        );
        setStatus("review");
      } else {
        setCourse(data.detected_course || null);
        setStep("student_resolution");
        setStatus("student_resolution");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if ((error as Error)?.name === "AbortError") {
        setAnalysisError("Análisis cancelado.");
      } else {
        setAnalysisError(
          error instanceof Error ? error.message : "Error de conexión.",
        );
      }
      setStatus("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleAnnotationTypeChange = (
    sequenceNumber: number,
    type: ReviewAnnotationType,
  ) => {
    const next = annotations.map((annotation) =>
      annotation.sequence_number === sequenceNumber
        ? { ...annotation, type }
        : annotation,
    );
    setAnnotations(next);
    setSummary(summaryFromAnnotations(next));
  };

  const handleAnnotationTextChange = (sequenceNumber: number, text: string) => {
    setAnnotations((current) =>
      updateReviewAnnotationText(current, sequenceNumber, text),
    );
  };

  const handleConfirm = async () => {
    if (
      confirmedRef.current ||
      confirmingRef.current ||
      isBusy ||
      Object.keys(textDraft.texts).length > 0
    )
      return;
    const tenantId = useAuthStore.getState().tenantId;
    if (!tenantId || !uploadedFile || !analysis || !selectedStudent || !file) {
      setAnalysisError("Faltan datos para confirmar el proceso.");
      return;
    }

    try {
      confirmingRef.current = true;
      setStatus("confirming");
      setAnalysisError(null);
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
          studentId: selectedStudent.id,
          suggestedLetterType: classification || suggestedType || "none",
          annotations,
          idempotencyKey: idempotencyKeyRef.current!,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || `Error del servidor (${response.status})`,
        );
      }

      const data = (await response.json()) as {
        processId: string;
        processNumber: string;
      };
      confirmedRef.current = true;
      clearSessionDraft(draftKey, JSON.stringify(draftValue));
      setCreatedProcess({ id: data.processId, number: data.processNumber });
      await queryClient.invalidateQueries({
        queryKey: ["disciplinary-snapshot", selectedStudent.id],
      });
      setStep("success");
      setStatus("success");
      await onProcessCreated?.({
        suggestedLetterType: classification || suggestedType || undefined,
        studentId: selectedStudent.id,
        processId: data.processId,
        processNumber: data.processNumber,
        summary: summary ?? undefined,
      });
      await invalidateDashboard();
      onClose();
    } catch (error) {
      if (confirmedRef.current) {
        setStatus("success");
        setStep("success");
        setAnalysisError(
          "El proceso fue confirmado, pero no se pudo refrescar la vista. No vuelva a confirmarlo; revise el historial.",
        );
        return;
      }
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Error al confirmar el proceso.",
      );
      setStatus("error");
    } finally {
      confirmingRef.current = false;
    }
  };

  const goNext = () => {
    if (step === "student_resolution") {
      if (selectedStudent) {
        setCourse(
          selectedStudent.course_name || selectedStudent.course_id || course,
        );
        setStep(
          duplicateFile || Number(selectedStudent.annotations_count ?? 0) > 0
            ? "duplicate_check"
            : "classification",
        );
      }
      return;
    }
    if (step === "duplicate_check") {
      continueAfterDuplicateWarning();
      return;
    }
    if (step === "classification") {
      setStep("review");
      setStatus("review");
      return;
    }
    if (step === "review") {
      void handleConfirm();
    }
  };

  const goBack = async () => {
    if (isBusy) {
      abortRef.current?.abort();
      setStep("upload");
      setStatus("idle");
      return;
    }
    if (step === "student_resolution") {
      setStep("upload");
      return;
    }
    if (step === "duplicate_check") {
      if (analysis?.selected_student_id) {
        setStep("upload");
      } else {
        setStep("student_resolution");
      }
      return;
    }
    if (step === "classification") {
      if (analysis?.selected_student_id) {
        setStep(
          duplicateFile || hasExistingStudentRecord
            ? "duplicate_check"
            : "upload",
        );
      } else {
        setStep("student_resolution");
      }
      return;
    }
    if (step === "review") setStep("classification");
  };

  const canNext = () => {
    if (step === "student_resolution") return !!selectedStudent;
    if (step === "classification") return !!classification;
    if (step === "review")
      return (
        !!selectedStudent &&
        !!uploadedFile &&
        !!analysis &&
        !!file &&
        !isBusy &&
        Object.keys(textDraft.texts).length === 0
      );
    return false;
  };

  const closeSafely = async () => {
    if (isBusy) return;
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && void closeSafely()}>
      <DialogContent
        hideClose
        className="max-h-[90vh] max-w-2xl overflow-y-auto p-0"
      >
        <DialogTitle className="sr-only">
          Nuevo Proceso Disciplinario
        </DialogTitle>
        <DialogDescription className="sr-only">
          Cargue, revise y confirme las anotaciones disciplinarias detectadas en
          un PDF.
        </DialogDescription>
        <div className="sticky top-0 z-10 border-neutral-100 border-b bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-lg text-neutral-800">
              Nuevo Proceso Disciplinario
            </h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => void closeSafely()}
              disabled={isBusy}
              className="rounded-xl p-3 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-1">
            {STEP_ORDER.map((labelStep, index) => (
              <div
                key={labelStep}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className={`h-1 w-full rounded-full ${index <= currentStepIndex ? "bg-brand-500" : "bg-neutral-200"}`}
                />
                <span className="font-medium text-10px text-neutral-500">
                  {STEP_LABELS[labelStep]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 p-4">
          {fileQuery.isError && restoringRef.current && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void fileQuery.refetch()}
            >
              Reintentar archivo guardado
            </Button>
          )}
          {step === "upload" && (
            <UploadAnalyzeStep
              file={file}
              isAnalyzing={isBusy}
              analysisError={analysisError}
              summary={summary}
              statusLabel={getStatusLabel(status)}
              hasAnalysis={Boolean(analysis)}
              onFileChange={(nextFile) => {
                restoringRef.current = false;
                confirmedRef.current = false;
                idempotencyKeyRef.current = crypto.randomUUID();
                setFile(nextFile);
                setUploadedFile(null);
                setAnalysis(null);
                setPreviousAnalysis(null);
                setSummary(null);
                setAnnotations([]);
                setTextDraft({ activeSequenceNumber: null, texts: {} });
                setClassification("");
                setAnalysisError(null);
                setStatus("idle");
              }}
              onAnalyze={handleAnalyze}
            />
          )}
          {step === "student_resolution" && (
            <StudentSelectStep
              students={availableStudents}
              course={null}
              selectedId={selectedStudent?.id ?? null}
              onSelect={(student) => {
                setSelectedStudent(student);
                void loadPreviousAnalysis(
                  student.id,
                  analysis?.analysis_id ?? null,
                );
              }}
              title="Confirmar estudiante"
              helperText={
                analysis?.detected_student_name
                  ? `Nombre detectado: ${analysis.detected_student_name}`
                  : "Selecciona manualmente un estudiante autorizado."
              }
            />
          )}
          {step === "classification" && (
            <>
              {rulesLoadFailed && (
                <div
                  role="alert"
                  className="mb-4 flex flex-col gap-3 rounded-xl border border-grave-200 bg-grave-50 p-3 text-sm text-grave-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    No se pudieron cargar las reglas institucionales. Se
                    muestran las opciones predeterminadas.
                  </span>
                  <Button
                    variant="custom"
                    onClick={() => void refetchRules()}
                    className="shrink-0 rounded-lg border border-grave-200 bg-white px-3 py-1.5 font-semibold text-grave-700 hover:bg-grave-100"
                  >
                    Reintentar
                  </Button>
                </div>
              )}
              <ClassificationStep
                value={classification}
                onChange={setClassification}
                summary={summary}
                options={ruleOptions.length > 0 ? ruleOptions : undefined}
                suggestedType={suggestedType}
              />
            </>
          )}
          {step === "duplicate_check" && (
            <div className="space-y-4">
              <div
                className={`rounded-xl border p-3 ${
                  duplicateFile
                    ? "border-gravisima-200 bg-gravisima-50"
                    : "border-grave-200 bg-grave-50"
                }`}
                role="alert"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-xl p-2 ${
                      duplicateFile
                        ? "bg-gravisima-100 text-gravisima-700"
                        : "bg-grave-100 text-grave-700"
                    }`}
                  >
                    {duplicateFile ? (
                      <FileWarning className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <h3
                      className={`font-semibold ${
                        duplicateFile ? "text-gravisima-700" : "text-grave-700"
                      }`}
                    >
                      {duplicateFile
                        ? "Este mismo PDF ya fue registrado"
                        : "El estudiante ya tiene anotaciones registradas"}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed ${
                        duplicateFile ? "text-gravisima-700" : "text-grave-700"
                      }`}
                    >
                      {duplicateFile
                        ? `El contenido coincide con el proceso ${duplicateFile.process_number}. Para proteger el historial, no se puede registrar nuevamente.`
                        : `${selectedStudent?.full_name ?? "El estudiante"} ya tiene ${existingAnnotationCount} anotación${existingAnnotationCount === 1 ? "" : "es"}. Puedes revisar el historial o continuar si este PDF contiene información nueva.`}
                    </p>
                    {!duplicateFile && (
                      <p className="text-grave-700 text-xs">
                        Al continuar, el sistema conservará el PDF como un nuevo
                        respaldo y omitirá las anotaciones que ya existan.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {!duplicateFile && previousAnalysis && summary && (
                <PdfAnalysisComparison
                  previous={previousAnalysis}
                  current={summary}
                  currentFileName={file?.name ?? "PDF nuevo"}
                  currentAnalyzedAt={analysis?.analyzed_at}
                />
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                {onOpenExistingStudent && existingStudentId && (
                  <Button
                    variant="secondary"
                    onClick={() => void openExistingStudent()}
                    className="flex-1 rounded-xl px-4 py-2.5 font-medium"
                  >
                    <History className="h-4 w-4" />
                    Abrir registro existente
                  </Button>
                )}
                {!duplicateFile && hasExistingStudentRecord && (
                  <Button
                    variant="custom"
                    onClick={continueAfterDuplicateWarning}
                    className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-sm text-white hover:bg-brand-700"
                  >
                    Subir PDF como actualización
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => void goBack()}
                  className="rounded-xl px-4 py-2.5 font-medium"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          {step === "review" && (
            <ReviewStep
              studentName={selectedStudent?.full_name ?? ""}
              course={course ?? selectedStudent?.course_name ?? ""}
              summary={summary}
              classification={classification}
              fileName={file?.name ?? ""}
              textDraft={textDraft}
              onTextDraftChange={setTextDraft}
              disabled={isBusy}
              annotations={annotations}
              warnings={analysis?.warnings ?? []}
              onAnnotationTypeChange={handleAnnotationTypeChange}
              onAnnotationTextChange={handleAnnotationTextChange}
            />
          )}
          {step === "success" && (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-leve-100">
                <Check className="h-6 w-6 text-leve-700" />
              </div>
              <div>
                <p className="font-semibold text-neutral-800">
                  Proceso creado correctamente
                </p>
                <p className="mt-1 text-neutral-500 text-sm">
                  {createdProcess?.number
                    ? `Número de proceso: ${createdProcess.number}`
                    : "El registro fue actualizado."}
                </p>
              </div>
            </div>
          )}

          {analysisError && step !== "upload" && (
            <div
              role="alert"
              className="rounded-xl border border-gravisima-200 bg-gravisima-50 p-3 text-gravisima-800 text-sm"
            >
              {analysisError}
            </div>
          )}
        </div>

        {step !== "duplicate_check" && (
          <div className="flex justify-between border-neutral-100 border-t p-4">
            <Button
              variant="ghost"
              onClick={step === "success" ? onClose : () => void goBack()}
              disabled={
                (step === "upload" && !isBusy) || status === "confirming"
              }
              className="rounded-xl px-4 py-2 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />{" "}
              {isBusy && status !== "confirming" ? "Cancelar" : "Anterior"}
            </Button>
            <Button
              variant="custom"
              onClick={step === "success" ? onClose : goNext}
              disabled={step !== "success" && !canNext()}
              className="rounded-xl bg-brand-600 px-5 py-2 font-medium text-sm text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {status === "confirming" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {step === "review"
                ? "Confirmar proceso"
                : step === "success"
                  ? "Cerrar"
                  : "Siguiente"}
              {step !== "review" && step !== "success" && (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
        {step !== "success" && (
          <div className="px-4 pb-4">
            <Button variant="ghost" disabled={isBusy} onClick={resetDraftState}>
              Descartar borrador
            </Button>
            <p className="mt-2 text-xs text-neutral-500">
              El borrador se conserva en esta pestaña al cerrar la vista o
              recargar. Cerrar la pestaña puede eliminarlo. Descartarlo no borra
              PDFs remotos.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
