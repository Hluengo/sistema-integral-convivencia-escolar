/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Student } from './NewDisciplinaryProcessModal/constants';
import { STEPS, sortCourses } from './NewDisciplinaryProcessModal/constants';
import { supabase } from '../../lib/supabase';
import type { AnnotationSummary } from '@/src/shared/lib/types';
import CourseSelectStep from './NewDisciplinaryProcessModal/CourseSelectStep';
import StudentSelectStep from './NewDisciplinaryProcessModal/StudentSelectStep';
import UploadAnalyzeStep from './NewDisciplinaryProcessModal/UploadAnalyzeStep';
import ClassificationStep from './NewDisciplinaryProcessModal/ClassificationStep';
import ReviewStep from './NewDisciplinaryProcessModal/ReviewStep';

GlobalWorkerOptions.workerSrc = workerUrl;

async function extractFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.md')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer el archivo .md'));
      reader.readAsText(file);
    });
  }

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

interface NewDisciplinaryProcessModalProps {
  students: Student[];
  onClose: () => void;
  currentUserEmail: string;
}

export default function NewDisciplinaryProcessModal({
  students,
  onClose,
  currentUserEmail: _currentUserEmail,
}: NewDisciplinaryProcessModalProps) {
  const [step, setStep] = useState(1);
  const [course, setCourse] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnnotationSummary | null>(null);
  const [classification, setClassification] = useState('');

  const courses = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const cn = s.course_name || s.course_id;
      if (cn) map.set(cn, (map.get(cn) || 0) + 1);
    });
    return sortCourses(Array.from(map.entries()).map(([n, c]) => ({ n, c })));
  }, [students]);

  const totalDetected = summary ? summary.negativas + summary.positivas + summary.informativas : 0;

  const canNext = () => {
    if (step === 1) return !!course;
    if (step === 2) return !!selectedStudent;
    if (step === 3) return totalDetected > 0;
    if (step === 4) return !!classification;
    return true;
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setSummary(null);
    try {
      const textContent = await extractFileText(file);

      if (!textContent || textContent.length < 20) {
        const isMd = file.name.toLowerCase().endsWith('.md');
        throw new Error(
          isMd
            ? 'El archivo .md está vacío. Verifica que contenga el texto de la hoja de vida.'
            : 'El PDF no contiene texto legible. Si es un documento escaneado, conviértelo a Markdown (.md) y súbelo de nuevo.'
        );
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/parse-annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ textContent, fileName: file.name }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let errMsg = `Error del servidor (${res.status})`;
        try {
          const errData = JSON.parse(text);
          if (errData.error) errMsg = errData.error;
        } catch {
          if (res.status === 504)
            errMsg =
              'El procesamiento excedió el tiempo límite. Intenta con un archivo .md más corto o divide el PDF.';
          else if (text) errMsg = text.slice(0, 200);
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (data.success && data.summary) {
        setSummary(data.summary as AnnotationSummary);
        if (selectedStudent) {
          const s = data.summary as AnnotationSummary;
          await supabase.from('document_analyses').insert({
            student_id: selectedStudent.id,
            file_name: file?.name || null,
            negativas: s.negativas,
            positivas: s.positivas,
            informativas: s.informativas,
            tenant_id: (await supabase.auth.getUser()).data.user?.app_metadata?.tenant_id,
          });
        }
        setStep(4);
      } else {
        setAnalysisError(data.error || 'Error al analizar el documento');
      }
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stepIndicator = (i: number) => {
    if (i + 1 < step) return <Check className="h-3 w-3 text-white" />;
    if (i + 1 === step)
      return <div className="h-3 w-3 rounded-full border-2 border-indigo-500 bg-white" />;
    return <div className="h-3 w-3 rounded-full bg-neutral-200" />;
  };

  const maxStep = 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl animate-scale-in overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-neutral-100 border-b bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-lg text-neutral-800">Nuevo Proceso Disciplinario</h2>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-1">
            {STEPS.filter((_, i) => i < 5).map((l, i) => (
              <div key={l} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-1 w-full rounded-full ${i + 1 <= step ? 'bg-indigo-500' : 'bg-neutral-200'}`}
                />
                <span className="font-medium text-[10px] text-neutral-500">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-6">
          {step === 1 && (
            <CourseSelectStep courses={courses} course={course} onSelect={setCourse} />
          )}
          {step === 2 && (
            <StudentSelectStep
              students={students}
              course={course}
              selectedId={selectedStudent?.id ?? null}
              onSelect={setSelectedStudent}
            />
          )}
          {step === 3 && (
            <UploadAnalyzeStep
              file={file}
              isAnalyzing={isAnalyzing}
              analysisError={analysisError}
              summary={summary}
              onFileChange={setFile}
              onAnalyze={handleAnalyze}
            />
          )}
          {step === 4 && (
            <ClassificationStep
              value={classification}
              onChange={setClassification}
              summary={summary}
            />
          )}
          {step === 5 && (
            <ReviewStep
              studentName={selectedStudent?.full_name ?? ''}
              course={course ?? ''}
              summary={summary}
              classification={classification}
              fileName={file?.name ?? ''}
            />
          )}
        </div>

        {step <= maxStep && (
          <div className="flex justify-between border-neutral-100 border-t p-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 font-medium text-neutral-600 text-sm hover:bg-neutral-100 disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>
            <button
              type="button"
              onClick={() => (step === maxStep ? onClose() : setStep((s) => s + 1))}
              disabled={!canNext()}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 font-medium text-sm text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              {step === maxStep ? 'Finalizar' : 'Siguiente'}{' '}
              {step !== maxStep && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
