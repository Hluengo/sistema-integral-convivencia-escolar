/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  FileText,
  AlertTriangle,
  Loader2,
  School,
  Users,
  Star,
  X,
} from 'lucide-react';

interface NewDisciplinaryProcessModalProps {
  students: Array<{
    id: string;
    full_name: string;
    course_id: string;
    teacher_id: string;
    annotations_count?: number;
    disciplinary_status?: string;
    rut?: string;
    course_name?: string;
  }>;
  onClose: () => void;
  onRegisterCase: (studentId: string, annotations: any[], fileData?: any) => void;
  currentUserEmail: string;
}

const STEPS = [
  'Curso',
  'Alumno',
  'Documentos',
  'An\u00E1lisis',
  'Resoluci\u00F3n',
  'Revisi\u00F3n',
  '\u00C9xito',
];

const LEVELS = [
  { key: 'BASICA', label: 'Educaci\u00F3n B\u00E1sica', icon: School },
  { key: 'MEDIA', label: 'Educaci\u00F3n Media', icon: Users },
];

function levelFromCourse(name: string): string {
  if (!name) {
    return 'BASICA';
  }
  return name.includes('Medio') ? 'MEDIA' : 'BASICA';
}

export default function NewDisciplinaryProcessModal({
  students,
  onClose,
  onRegisterCase,
  currentUserEmail: _currentUserEmail,
}: NewDisciplinaryProcessModalProps) {
  const [step, setStep] = useState(1);
  const [course, setCourse] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [detected, setDetected] = useState<any[]>([]);
  const [classification, setClassification] = useState<string>('');

  const fileRef = useRef<HTMLInputElement>(null);

  const courses = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      const cn = s.course_name || s.course_id;
      if (cn) {
        map.set(cn, (map.get(cn) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([n, c]) => ({ n, c }));
  }, [students]);

  const filtered = useMemo(() => {
    if (!course) {
      return [];
    }
    return students.filter((s) => (s.course_name || s.course_id) === course);
  }, [course, students]);

  const canNext = () => {
    if (step === 1) {
      return !!course;
    }
    if (step === 2) {
      return !!selectedStudent;
    }
    if (step === 3) {
      return !!file;
    }
    if (step === 4) {
      return detected.length > 0;
    }
    if (step === 5) {
      return !!classification;
    }
    return true;
  };

  const handleAnalyze = async () => {
    if (!file) {
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve) => {
        reader.onload = resolve;
      });
      const base64 = (reader.result as string).split(',')[1];
      const res = await fetch('/api/parse-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: base64,
          mimeType: file.type || 'application/pdf',
          fileName: file.name,
        }),
      });
      const data = await res.json();
      if (data.success && data.annotations) {
        setDetected(data.annotations);
      } else {
        setAnalysisError(data.error || 'Error al analizar el documento');
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Error de conexi\u00F3n');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRegister = () => {
    if (!selectedStudent) {
      return;
    }
    onRegisterCase(selectedStudent.id, detected, file ? { name: file.name } : undefined);
    setStep(7);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
    }
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const _stepIndicator = (i: number) => {
    if (i + 1 < step) {
      return <Check className="h-3 w-3 text-white" />;
    }
    if (i + 1 === step) {
      return <div className="h-3 w-3 rounded-full border-2 border-indigo-500 bg-white" />;
    }
    return <div className="h-3 w-3 rounded-full bg-neutral-200" />;
  };

  const activeClass = (i: number) => {
    if (i + 1 <= step) {
      return 'bg-indigo-500';
    }
    return 'bg-neutral-200';
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
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-1">
            {STEPS.map((l, i) => (
              <div key={l} className="flex flex-1 flex-col items-center gap-1">
                <div className={`h-1 w-full rounded-full${activeClass(i)}`} />
                <span className="font-medium text-[10px] text-neutral-500">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 font-medium text-neutral-600 text-sm">
                <School className="h-4 w-4 text-indigo-600" /> Selecciona el curso
              </p>
              {LEVELS.map(({ key, label, icon: Icon }) => {
                const cs = courses.filter((c) => levelFromCourse(c.n) === key);
                if (!cs.length) {
                  return null;
                }
                return (
                  <div key={key}>
                    <h4 className="mb-2 flex items-center gap-1.5 font-bold text-neutral-500 text-xs uppercase tracking-wider">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {cs.map((c) => (
                        <button
                          key={c.n}
                          type="button"
                          onClick={() => setCourse(c.n)}
                          className={`rounded-xl border p-3 text-left transition-all${course === c.n ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-neutral-200 hover:border-neutral-300'}`}
                        >
                          <p className="font-semibold text-neutral-800 text-sm">{c.n}</p>
                          <p className="text-neutral-400 text-xs">
                            {c.c} estudiante{c.c !== 1 ? 's' : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-medium text-neutral-600 text-sm">
                <Users className="h-4 w-4 text-indigo-600" /> Estudiantes de {course}
              </p>
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-sm">
                  No hay estudiantes en este curso.
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {filtered.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStudent(s)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all${selectedStudent?.id === s.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-neutral-200 hover:border-neutral-300'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-neutral-800 text-sm">
                          {s.full_name}
                        </p>
                        <p className="text-neutral-400 text-xs">
                          {s.rut ? `RUT: ${s.rut} | ` : ''}
                          {s.annotations_count ?? 0} anotacion
                          {(s.annotations_count ?? 0) !== 1 ? 'es' : ''}
                        </p>
                      </div>
                      {s.disciplinary_status && (
                        <span
                          className={`ml-2 shrink-0 rounded-full px-2.5 py-1 font-bold text-[10px]${s.disciplinary_status === 'Verde' ? 'bg-emerald-100 text-emerald-700' : s.disciplinary_status === 'Amarillo' ? 'bg-yellow-100 text-yellow-700' : s.disciplinary_status === 'Naranja' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700'}`}
                        >
                          {s.disciplinary_status}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 font-medium text-neutral-600 text-sm">
                <Upload className="h-4 w-4 text-indigo-600" /> Subir Hoja de Vida (PDF)
              </p>
              <button
                type="button"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all${drag ? 'border-indigo-500 bg-indigo-50' : 'border-neutral-300 hover:border-neutral-400'}`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  onChange={onPick}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-neutral-400" />
                  <p className="text-neutral-500 text-sm">
                    Arrastra un PDF o haz clic para seleccionar
                  </p>
                  {file && <p className="font-medium text-indigo-600 text-xs">{file.name}</p>}
                </div>
              </button>
              {file && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 font-medium text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {isAnalyzing ? 'Analizando...' : 'Subir y Analizar'}
                </button>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 font-medium text-neutral-600 text-sm">
                <Star className="h-4 w-4 text-indigo-600" /> An\u00E1lisis del Documento
              </p>
              {analysisError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}
              {detected.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-neutral-700 text-sm">
                    Se detectaron {detected.length} anotaciones:
                  </p>
                  {detected.map((a: any, i: number) => (
                    <div
                      key={a.id || a.date + a.text || i}
                      className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-neutral-50 p-2.5"
                    >
                      <div
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full${a.severity === 'Leve' ? 'bg-emerald-500' : a.severity === 'Grave' ? 'bg-yellow-500' : a.severity === 'Muy Grave' ? 'bg-orange-500' : 'bg-rose-500'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-neutral-400 text-xs">{a.date || 'Sin fecha'}</p>
                        <p className="text-neutral-700 text-sm">{a.text}</p>
                        <p className="text-neutral-400 text-xs">
                          {a.registered_by} - {a.severity} ({a.type})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isAnalyzing && !analysisError && detected.length === 0 && file && (
                <p className="py-4 text-center text-neutral-500 text-sm">
                  Haz clic en "Subir y Analizar" para procesar el documento.
                </p>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="font-medium text-neutral-600 text-sm">
                Clasificaci\u00F3n de la Medida
              </p>
              <div className="space-y-2">
                {[
                  {
                    value: 'amonestacion',
                    label: 'Amonestaci\u00F3n Escrita',
                    desc: 'Para estudiantes con 5-9 anotaciones negativas. Medida formativa.',
                    legal: 'Art. 24 RICE 2026 - Circular 482',
                  },
                  {
                    value: 'compromiso',
                    label: 'Carta de Compromiso Conductual',
                    desc: 'Para estudiantes con 10-14 anotaciones. Acuerdo formal.',
                    legal: 'Art. 25 RICE 2026 - Ley 21.809',
                  },
                  {
                    value: 'derivacion',
                    label: 'Derivaci\u00F3n a Convivencia Escolar',
                    desc: 'Para estudiantes con 15+ anotaciones. Intervenci\u00F3n especializada.',
                    legal: 'Art. 26-27 RICE 2026 - Circular 482',
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setClassification(opt.value)}
                    className={`w-full rounded-xl border p-4 text-left transition-all${classification === opt.value ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-neutral-200 hover:border-neutral-300'}`}
                  >
                    <p className="font-semibold text-neutral-800 text-sm">{opt.label}</p>
                    <p className="mt-1 text-neutral-500 text-xs">{opt.desc}</p>
                    <p className="mt-1 font-mono text-neutral-400 text-xs">{opt.legal}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <p className="font-medium text-neutral-600 text-sm">Revisi\u00F3n Final</p>
              <div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Estudiante:</span>
                  <span className="font-medium text-neutral-800">{selectedStudent?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Curso:</span>
                  <span className="font-medium text-neutral-800">{course}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Anotaciones:</span>
                  <span className="font-medium text-neutral-800">{detected.length} detectadas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Medida:</span>
                  <span className="font-medium text-neutral-800">
                    {classification === 'amonestacion'
                      ? 'Amonestaci\u00F3n Escrita'
                      : classification === 'compromiso'
                        ? 'Carta de Compromiso'
                        : 'Derivaci\u00F3n'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Documento:</span>
                  <span className="font-medium text-neutral-800">{file?.name || 'Ninguno'}</span>
                </div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4 py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="font-bold text-lg text-neutral-800">Proceso Registrado</h3>
              <p className="text-neutral-500 text-sm">El caso ha sido registrado exitosamente.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-sm text-white hover:bg-indigo-700"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>

        {step < 7 && (
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
              onClick={() => (step === 6 ? handleRegister() : setStep((s) => s + 1))}
              disabled={!canNext()}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 font-medium text-sm text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              {step === 6 ? 'Registrar' : 'Siguiente'} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
