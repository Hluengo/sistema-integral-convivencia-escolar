/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Upload, FileText,
  AlertTriangle, Loader2, School, Users, Star, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NewDisciplinaryProcessModalProps {
  students: Array<{
    id: string; full_name: string; course_id: string; teacher_id: string;
    annotations_count?: number; disciplinary_status?: string; rut?: string; course_name?: string;
  }>;
  onClose: () => void;
  onRegisterCase: (studentId: string, annotations: any[], fileData?: any) => void;
  currentUserEmail: string;
}

const STEPS = ['Curso', 'Alumno', 'Documentos', 'An\u00E1lisis', 'Resoluci\u00F3n', 'Revisi\u00F3n', '\u00C9xito'];

const LEVELS = [
  { key: 'BASICA', label: 'Educaci\u00F3n B\u00E1sica', icon: School },
  { key: 'MEDIA', label: 'Educaci\u00F3n Media', icon: Users },
];

function levelFromCourse(name: string): string {
  if (!name) return 'BASICA';
  return name.includes('Medio') ? 'MEDIA' : 'BASICA';
}

export default function NewDisciplinaryProcessModal({
  students, onClose, onRegisterCase, currentUserEmail
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
    students.forEach(s => {
      const cn = s.course_name || s.course_id;
      if (cn) map.set(cn, (map.get(cn) || 0) + 1);
    });
    return Array.from(map.entries()).map(([n, c]) => ({ n, c }));
  }, [students]);

  const filtered = useMemo(() => {
    if (!course) return [];
    return students.filter(s => (s.course_name || s.course_id) === course);
  }, [course, students]);

  const canNext = () => {
    if (step === 1) return !!course;
    if (step === 2) return !!selectedStudent;
    if (step === 3) return !!file;
    if (step === 4) return detected.length > 0;
    if (step === 5) return !!classification;
    return true;
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve) => { reader.onload = resolve; });
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
    if (!selectedStudent) return;
    onRegisterCase(selectedStudent.id, detected, file ? { name: file.name } : undefined);
    setStep(7);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === 'application/pdf') setFile(f);
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const stepIndicator = (i: number) => {
    if (i + 1 < step) return <Check className="w-3 h-3 text-white" />;
    if (i + 1 === step) return <div className="w-3 h-3 rounded-full bg-white border-2 border-indigo-500" />;
    return <div className="w-3 h-3 rounded-full bg-neutral-200" />;
  };

  const activeClass = (i: number) => {
    if (i + 1 <= step) return 'bg-indigo-500';
    return 'bg-neutral-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 animate-scale-in">
        <div className="sticky top-0 bg-white z-10 border-b border-neutral-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-neutral-800">Nuevo Proceso Disciplinario</h2>
            <button type="button" aria-label="Cerrar" onClick={onClose} className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-1">
            {STEPS.map((l, i) => (
              <div key={l} className="flex-1 flex flex-col items-center gap-1">
                <div className={'w-full h-1 rounded-full ' + activeClass(i)} />
                <span className="text-[10px] font-medium text-neutral-500">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 font-medium flex items-center gap-2">
                <School className="w-4 h-4 text-indigo-600" /> Selecciona el curso
              </p>
              {LEVELS.map(({ key, label, icon: Icon }) => {
                const cs = courses.filter(c => levelFromCourse(c.n) === key);
                if (!cs.length) return null;
                return (
                  <div key={key}>
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cs.map(c => (
                        <button key={c.n} type="button" onClick={() => setCourse(c.n)}
                          className={'p-3 rounded-xl border text-left transition-all ' + (course === c.n ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-neutral-200 hover:border-neutral-300')}>
                          <p className="text-sm font-semibold text-neutral-800">{c.n}</p>
                          <p className="text-xs text-neutral-400">{c.c} estudiante{c.c !== 1 ? 's' : ''}</p>
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
              <p className="text-sm text-neutral-600 font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" /> Estudiantes de {course}
              </p>
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-sm">No hay estudiantes en este curso.</div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {filtered.map(s => (
                    <button key={s.id} type="button" onClick={() => setSelectedStudent(s)}
                      className={'w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ' + (selectedStudent?.id === s.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-neutral-200 hover:border-neutral-300')}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-neutral-800 truncate">{s.full_name}</p>
                        <p className="text-xs text-neutral-400">{s.rut ? 'RUT: ' + s.rut + ' | ' : ''}{s.annotations_count ?? 0} anotacion{(s.annotations_count ?? 0) !== 1 ? 'es' : ''}</p>
                      </div>
                      {s.disciplinary_status && (
                        <span className={'text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ml-2 ' + (s.disciplinary_status === 'Verde' ? 'bg-emerald-100 text-emerald-700' : s.disciplinary_status === 'Amarillo' ? 'bg-yellow-100 text-yellow-700' : s.disciplinary_status === 'Naranja' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700')}>{s.disciplinary_status}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 font-medium flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" /> Subir Hoja de Vida (PDF)
              </p>
              <button type="button"
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)} onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all w-full ' + (drag ? 'border-indigo-500 bg-indigo-50' : 'border-neutral-300 hover:border-neutral-400')}>
                <input ref={fileRef} type="file" accept=".pdf" onChange={onPick} className="hidden" />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-neutral-400" />
                  <p className="text-sm text-neutral-500">Arrastra un PDF o haz clic para seleccionar</p>
                  {file && <p className="text-xs font-medium text-indigo-600">{file.name}</p>}
                </div>
              </button>
              {file && (
                <button type="button" onClick={handleAnalyze} disabled={isAnalyzing}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {isAnalyzing ? 'Analizando...' : 'Subir y Analizar'}
                </button>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 font-medium flex items-center gap-2">
                <Star className="w-4 h-4 text-indigo-600" /> An\u00E1lisis del Documento
              </p>
              {analysisError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}
              {detected.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-700">Se detectaron {detected.length} anotaciones:</p>
                  {detected.map((a: any, i: number) => (
                    <div key={a.id || a.date + a.text || i} className="flex items-start gap-2 p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                      <div className={'mt-0.5 w-2 h-2 rounded-full shrink-0 ' + (a.severity === 'Leve' ? 'bg-emerald-500' : a.severity === 'Grave' ? 'bg-yellow-500' : a.severity === 'Muy Grave' ? 'bg-orange-500' : 'bg-rose-500')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-400">{a.date || 'Sin fecha'}</p>
                        <p className="text-sm text-neutral-700">{a.text}</p>
                        <p className="text-xs text-neutral-400">{a.registered_by} - {a.severity} ({a.type})</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isAnalyzing && !analysisError && detected.length === 0 && file && (
                <p className="text-sm text-neutral-500 text-center py-4">Haz clic en "Subir y Analizar" para procesar el documento.</p>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 font-medium">Clasificaci\u00F3n de la Medida</p>
              <div className="space-y-2">
                {[
                  { value: 'amonestacion', label: 'Amonestaci\u00F3n Escrita', desc: 'Para estudiantes con 5-9 anotaciones negativas. Medida formativa.', legal: 'Art. 24 RICE 2026 - Circular 482' },
                  { value: 'compromiso', label: 'Carta de Compromiso Conductual', desc: 'Para estudiantes con 10-14 anotaciones. Acuerdo formal.', legal: 'Art. 25 RICE 2026 - Ley 21.809' },
                  { value: 'derivacion', label: 'Derivaci\u00F3n a Convivencia Escolar', desc: 'Para estudiantes con 15+ anotaciones. Intervenci\u00F3n especializada.', legal: 'Art. 26-27 RICE 2026 - Circular 482' },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setClassification(opt.value)}
                    className={'w-full text-left p-4 rounded-xl border transition-all ' + (classification === opt.value ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-neutral-200 hover:border-neutral-300')}>
                    <p className="font-semibold text-neutral-800 text-sm">{opt.label}</p>
                    <p className="text-xs text-neutral-500 mt-1">{opt.desc}</p>
                    <p className="text-xs text-neutral-400 mt-1 font-mono">{opt.legal}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 font-medium">Revisi\u00F3n Final</p>
              <div className="bg-neutral-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Estudiante:</span><span className="font-medium text-neutral-800">{selectedStudent?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Curso:</span><span className="font-medium text-neutral-800">{course}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Anotaciones:</span><span className="font-medium text-neutral-800">{detected.length} detectadas</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Medida:</span><span className="font-medium text-neutral-800">{classification === 'amonestacion' ? 'Amonestaci\u00F3n Escrita' : classification === 'compromiso' ? 'Carta de Compromiso' : 'Derivaci\u00F3n'}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Documento:</span><span className="font-medium text-neutral-800">{file?.name || 'Ninguno'}</span></div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800">Proceso Registrado</h3>
              <p className="text-sm text-neutral-500">El caso ha sido registrado exitosamente.</p>
              <button type="button" onClick={onClose} className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
                Cerrar
              </button>
            </div>
          )}
        </div>

        {step < 7 && (
          <div className="border-t border-neutral-100 p-4 flex justify-between">
            <button type="button" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-30">
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>
            <button type="button" onClick={() => step === 6 ? handleRegister() : setStep(s => s + 1)} disabled={!canNext()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
              {step === 6 ? 'Registrar' : 'Siguiente'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

