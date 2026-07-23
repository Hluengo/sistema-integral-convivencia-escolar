/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import type { Student } from './NewDisciplinaryProcessModal/constants';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import type { AnnotationSummary } from '@/src/shared/lib/types';
import { fetchDisciplinaryRules } from '@/src/shared/api/services/disciplinary-rules.service';
import type { DisciplinaryRule } from '@/src/shared/api/services/disciplinary-rules.service';
import {
  type UploadedDisciplinaryFile,
  uploadDisciplinaryFile,
} from '@/src/shared/api/services/disciplinary-storage.service';
import StudentSelectStep from './NewDisciplinaryProcessModal/StudentSelectStep';
import UploadAnalyzeStep from './NewDisciplinaryProcessModal/UploadAnalyzeStep';
import ClassificationStep from './NewDisciplinaryProcessModal/ClassificationStep';
import ReviewStep, {
  type ReviewAnnotation,
  type ReviewAnnotationType,
} from './NewDisciplinaryProcessModal/ReviewStep';

type FlowStep = 'upload' | 'student_resolution' | 'classification' | 'review' | 'success';
type ProcessingState =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'processing'
  | 'student_resolution'
  | 'review'
  | 'confirming'
  | 'success'
  | 'error';

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

interface NewDisciplinaryProcessModalProps {
  students: Student[];
  onClose: () => void;
  currentUserEmail: string;
  onProcessCreated?: (result?: ProcessResult) => void;
}

const STEP_LABELS: Record<FlowStep, string> = {
  upload: 'Documento',
  student_resolution: 'Estudiante',
  classification: 'Carta',
  review: 'Revisión',
  success: 'Éxito',
};

const STEP_ORDER: FlowStep[] = ['upload', 'student_resolution', 'classification', 'review', 'success'];

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

function matchLocalStudent(students: Student[], candidate: StudentCandidate): Student {
  const local = students.find((student) => student.id === candidate.id);
  if (local) return local;
  return {
    id: candidate.id,
    full_name: candidate.full_name,
    rut: candidate.rut ?? undefined,
    course_id: candidate.course_id ?? '',
    course_name: candidate.course_name ?? undefined,
    teacher_id: '',
  };
}

function getStatusLabel(status: ProcessingState): string {
  switch (status) {
    case 'validating':
      return 'Validando archivo...';
    case 'uploading':
      return 'Subiendo PDF privado...';
    case 'processing':
      return 'Analizando en backend...';
    case 'confirming':
      return 'Confirmando proceso...';
    default:
      return 'Analizando...';
  }
}

export default function NewDisciplinaryProcessModal({
  students,
  onClose,
  currentUserEmail: _currentUserEmail,
  onProcessCreated,
}: NewDisciplinaryProcessModalProps) {
  const [step, setStep] = useState<FlowStep>('upload');
  const [status, setStatus] = useState<ProcessingState>('idle');
  const [course, setCourse] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentCandidates, setStudentCandidates] = useState<Student[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedDisciplinaryFile | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnnotationSummary | null>(null);
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>([]);
  const [suggestedType, setSuggestedType] = useState<string | null>(null);
  const [classification, setClassification] = useState('');
  const [rules, setRules] = useState<DisciplinaryRule[]>([]);
  const [createdProcess, setCreatedProcess] = useState<{ id: string; number: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    fetchDisciplinaryRules().then(setRules).catch(() => setRules([]));
  }, []);


  const ruleOptions = useMemo(() => {
    if (rules.length === 0) return [];
    return rules.map((rule) => ({
      value: rule.suggested_letter_type,
      label: rule.rule_name,
      desc: rule.description || `Negativas: ${rule.min_negativas ?? 0}-${rule.max_negativas ?? '∞'}`,
      legal: `Prioridad ${rule.priority}`,
    }));
  }, [rules]);

  const availableStudents = studentCandidates.length > 0 ? studentCandidates : students;
  const isBusy = status === 'validating' || status === 'uploading' || status === 'processing' || status === 'confirming';
  const currentStepIndex = STEP_ORDER.indexOf(step);

  const handleAnalyze = async () => {
    if (!file) return;
    const tenantId = useAuthStore.getState().tenantId;
    if (!tenantId) {
      setAnalysisError('No se pudo resolver el establecimiento activo del usuario.');
      setStatus('error');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('validating');
    setAnalysisError(null);
    setAnalysis(null);
    setSummary(null);
    setAnnotations([]);
    setSelectedStudent(null);
    setStudentCandidates([]);

    try {
      setStatus('uploading');
      const uploaded = await uploadDisciplinaryFile(file, tenantId);
      if (!uploaded) throw new Error('No fue posible subir el PDF.');
      setUploadedFile(uploaded);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      setStatus('processing');
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
      setSummary(data.summary);
      setAnnotations(data.annotations || []);
      setSuggestedType(data.recommended_letter_type || 'none');
      setClassification(data.recommended_letter_type && data.recommended_letter_type !== 'none' ? data.recommended_letter_type : 'none');

      const candidates = (data.student_candidates || []).map((candidate) => matchLocalStudent(students, candidate));
      setStudentCandidates(candidates);

      const selected = data.selected_student_id
        ? students.find((student) => student.id === data.selected_student_id) ||
          candidates.find((student) => student.id === data.selected_student_id) ||
          null
        : null;

      if (selected) {
        setSelectedStudent(selected);
        setCourse(selected.course_name || selected.course_id || data.detected_course || null);
        setStep('classification');
        setStatus('review');
      } else {
        setCourse(data.detected_course || null);
        setStep('student_resolution');
        setStatus('student_resolution');
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        setAnalysisError('Análisis cancelado.');
      } else {
        setAnalysisError(error instanceof Error ? error.message : 'Error de conexión.');
      }
      setStatus('error');
    } finally {
      abortRef.current = null;
    }
  };

  const handleAnnotationTypeChange = (sequenceNumber: number, type: ReviewAnnotationType) => {
    const next = annotations.map((annotation) =>
      annotation.sequence_number === sequenceNumber ? { ...annotation, type } : annotation
    );
    setAnnotations(next);
    setSummary(summaryFromAnnotations(next));
  };

  const handleConfirm = async () => {
    const tenantId = useAuthStore.getState().tenantId;
    if (!tenantId || !uploadedFile || !analysis || !selectedStudent || !file) {
      setAnalysisError('Faltan datos para confirmar el proceso.');
      return;
    }

    try {
      setStatus('confirming');
      setAnalysisError(null);
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
          studentId: selectedStudent.id,
          suggestedLetterType: classification || suggestedType || 'none',
          annotations,
          idempotencyKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Error del servidor (${response.status})`);
      }

      const data = (await response.json()) as { processId: string; processNumber: string };
      setCreatedProcess({ id: data.processId, number: data.processNumber });
      setStep('success');
      setStatus('success');
      onProcessCreated?.({
        suggestedLetterType: classification || suggestedType || undefined,
        studentId: selectedStudent.id,
        processId: data.processId,
        processNumber: data.processNumber,
        summary: summary ?? undefined,
      });
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Error al confirmar el proceso.');
      setStatus('error');
    }
  };

  const goNext = () => {
    if (step === 'student_resolution') {
      if (selectedStudent) {
        setCourse(selectedStudent.course_name || selectedStudent.course_id || course);
        setStep('classification');
      }
      return;
    }
    if (step === 'classification') {
      setStep('review');
      setStatus('review');
      return;
    }
    if (step === 'review') {
      void handleConfirm();
    }
  };

  const goBack = () => {
    if (isBusy) {
      abortRef.current?.abort();
      return;
    }
    if (step === 'student_resolution') setStep('upload');
    if (step === 'classification') setStep(analysis?.selected_student_id ? 'upload' : 'student_resolution');
    if (step === 'review') setStep('classification');
  };

  const canNext = () => {
    if (step === 'student_resolution') return !!selectedStudent;
    if (step === 'classification') return !!classification;
    if (step === 'review') return !!selectedStudent && !!uploadedFile && !!analysis && !isBusy;
    return false;
  };

  const closeSafely = () => {
    if (isBusy) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl animate-scale-in overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-neutral-100 border-b bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-lg text-neutral-800">Nuevo Proceso Disciplinario</h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={closeSafely}
              disabled={isBusy}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-1">
            {STEP_ORDER.map((labelStep, index) => (
              <div key={labelStep} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-1 w-full rounded-full ${index <= currentStepIndex ? 'bg-indigo-500' : 'bg-neutral-200'}`}
                />
                <span className="font-medium text-[10px] text-neutral-500">{STEP_LABELS[labelStep]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-6">
          {step === 'upload' && (
            <UploadAnalyzeStep
              file={file}
              isAnalyzing={isBusy}
              analysisError={analysisError}
              summary={summary}
              statusLabel={getStatusLabel(status)}
              onFileChange={(nextFile) => {
                setFile(nextFile);
                setUploadedFile(null);
                setAnalysis(null);
                setSummary(null);
                setAnnotations([]);
                setAnalysisError(null);
                setStatus('idle');
              }}
              onAnalyze={handleAnalyze}
            />
          )}
          {step === 'student_resolution' && (
            <StudentSelectStep
              students={availableStudents}
              course={null}
              selectedId={selectedStudent?.id ?? null}
              onSelect={setSelectedStudent}
              title="Confirmar estudiante"
              helperText={
                analysis?.detected_student_name
                  ? `Nombre detectado: ${analysis.detected_student_name}`
                  : 'Selecciona manualmente un estudiante autorizado.'
              }
            />
          )}
          {step === 'classification' && (
            <ClassificationStep
              value={classification}
              onChange={setClassification}
              summary={summary}
              options={ruleOptions.length > 0 ? ruleOptions : undefined}
              suggestedType={suggestedType}
            />
          )}
          {step === 'review' && (
            <ReviewStep
              studentName={selectedStudent?.full_name ?? ''}
              course={course ?? selectedStudent?.course_name ?? ''}
              summary={summary}
              classification={classification}
              fileName={file?.name ?? ''}
              annotations={annotations}
              warnings={analysis?.warnings ?? []}
              onAnnotationTypeChange={handleAnnotationTypeChange}
            />
          )}
          {step === 'success' && (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="font-semibold text-neutral-800">Proceso creado correctamente</p>
                <p className="mt-1 text-neutral-500 text-sm">
                  {createdProcess?.number ? `Número de proceso: ${createdProcess.number}` : 'El registro fue actualizado.'}
                </p>
              </div>
            </div>
          )}

          {analysisError && step !== 'upload' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">
              {analysisError}
            </div>
          )}
        </div>

        <div className="flex justify-between border-neutral-100 border-t p-4">
          <button
            type="button"
            onClick={step === 'success' ? onClose : goBack}
            disabled={(step === 'upload' && !isBusy) || status === 'confirming'}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-neutral-600 text-sm hover:bg-neutral-100 disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> {isBusy && status !== 'confirming' ? 'Cancelar' : 'Anterior'}
          </button>
          <button
            type="button"
            onClick={step === 'success' ? onClose : goNext}
            disabled={step !== 'success' && !canNext()}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 font-medium text-sm text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {status === 'confirming' && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === 'review' ? 'Confirmar proceso' : step === 'success' ? 'Cerrar' : 'Siguiente'}
            {step !== 'review' && step !== 'success' && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
