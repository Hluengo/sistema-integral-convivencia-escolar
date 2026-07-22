/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Student } from './NewDisciplinaryProcessModal/constants';
import { STEPS, sortCourses } from './NewDisciplinaryProcessModal/constants';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import CourseSelectStep from './NewDisciplinaryProcessModal/CourseSelectStep';
import StudentSelectStep from './NewDisciplinaryProcessModal/StudentSelectStep';
import UploadAnalyzeStep from './NewDisciplinaryProcessModal/UploadAnalyzeStep';
import ClassificationStep from './NewDisciplinaryProcessModal/ClassificationStep';
import ReviewStep from './NewDisciplinaryProcessModal/ReviewStep';

GlobalWorkerOptions.workerSrc = workerUrl;

const STORAGE_BUCKET = 'anotaciones';

async function uploadPdf(file: File): Promise<string | null> {
  const tenantId = useAuthStore.getState().tenantId;
  if (!tenantId) return null;
  const filePath = `${tenantId}/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });
  if (error) {
    console.error('Error uploading PDF to storage:', error);
    return null;
  }
  return filePath;
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const pageTexts = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then(async (page) => {
        const content = await page.getTextContent();
        return content.items
          .flatMap((item) => ('str' in item ? [(item as { str: string }).str] : []))
          .join(' ');
      })
    )
  );
  return pageTexts.join('\n').trim();
}

interface FileData {
  name: string;
  storagePath?: string | null;
}

interface NewDisciplinaryProcessModalProps {
  students: Student[];
  onClose: () => void;
  onRegisterCase: (studentId: string, annotations: unknown[], fileData?: FileData) => void;
  currentUserEmail: string;
}

export default function NewDisciplinaryProcessModal({
  students,
  onClose,
  onRegisterCase,
  currentUserEmail: _currentUserEmail,
}: NewDisciplinaryProcessModalProps) {
  const [step, setStep] = useState(1);
  const [course, setCourse] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [detected, setDetected] = useState<unknown[]>([]);
  const [classification, setClassification] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const pdfStoragePathRef = useRef<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const courses = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const cn = s.course_name || s.course_id;
      if (cn) map.set(cn, (map.get(cn) || 0) + 1);
    });
    return sortCourses(Array.from(map.entries()).map(([n, c]) => ({ n, c })));
  }, [students]);

  const canNext = () => {
    if (isRegistering) return false;
    if (step === 1) return !!course;
    if (step === 2) return !!selectedStudent;
    if (step === 3) return detected.length > 0;
    if (step === 4) return !!classification;
    return true;
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    pdfStoragePathRef.current = null;
    try {
      const storagePath = await uploadPdf(file);
      if (storagePath) {
        pdfStoragePathRef.current = storagePath;
      }

      const textContent = await extractPdfText(file);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/parse-annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ textContent, fileName: file.name }),
      });
      const data = await res.json();
      if (data.success && data.annotations) {
        setDetected(data.annotations);
        setStep(3);
      } else {
        setAnalysisError(data.error || 'Error al analizar el documento');
      }
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedStudent || isRegistering) return;
    setIsRegistering(true);
    setRegisterError(null);
    try {
      await onRegisterCase(selectedStudent.id, detected, file ? { name: file.name, storagePath: pdfStoragePathRef.current } : undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el caso.';
      setRegisterError(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  const stepIndicator = (i: number) => {
    if (i + 1 < step) return <Check className="h-3 w-3 text-white" />;
    if (i + 1 === step) return <div className="h-3 w-3 rounded-full border-2 border-indigo-500 bg-white" />;
    return <div className="h-3 w-3 rounded-full bg-neutral-200" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl animate-scale-in overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-neutral-100 border-b bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-lg text-neutral-800">Nuevo Proceso Disciplinario</h2>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-1">
            {STEPS.map((l, i) => (
              <div key={l} className="flex flex-1 flex-col items-center gap-1">
                <div className={`h-1 w-full rounded-full ${i + 1 <= step ? 'bg-indigo-500' : 'bg-neutral-200'}`} />
                <span className="font-medium text-[10px] text-neutral-500">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-6">
          {step === 1 && <CourseSelectStep courses={courses} course={course} onSelect={setCourse} />}
          {step === 2 && <StudentSelectStep students={students} course={course} selectedId={selectedStudent?.id ?? null} onSelect={setSelectedStudent} />}
          {step === 3 && (
            <UploadAnalyzeStep
              file={file}
              isAnalyzing={isAnalyzing}
              analysisError={analysisError}
              detected={detected}
              onFileChange={setFile}
              onAnalyze={handleAnalyze}
            />
          )}
          {step === 4 && <ClassificationStep value={classification} onChange={setClassification} detected={detected} />}
          {step === 5 && (
            <ReviewStep
              studentName={selectedStudent?.full_name ?? ''}
              course={course ?? ''}
              annotations={detected}
              classification={classification}
              fileName={file?.name ?? ''}
            />
          )}

          {registerError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
              {registerError}
            </div>
          )}
        </div>

        {step <= 5 && (
          <div className="flex justify-between border-neutral-100 border-t p-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1 || isRegistering}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-neutral-600 text-sm hover:bg-neutral-100 disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>
            <button
              type="button"
              onClick={() => (step === 5 ? handleRegister() : setStep((s) => s + 1))}
              disabled={!canNext()}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 font-medium text-sm text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              {isRegistering ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Registrando...</>
              ) : (
                <>{step === 5 ? 'Registrar' : 'Siguiente'} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
