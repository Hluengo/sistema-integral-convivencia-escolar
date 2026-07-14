import React, { useState, useRef } from 'react';
import { 
  X, User, Shield, AlertTriangle, Calendar, Clock, 
  FileText, CheckCircle, PlusCircle, ArrowRight, 
  Eye, EyeOff, Lock, MessageSquare, Send, CheckCircle2, 
  ChevronRight, AlertCircle, FileSpreadsheet, Upload, 
  Sparkles, Award, ThumbsUp, Trash2, Printer, CheckSquare, Square
} from 'lucide-react';
import { Student, Annotation } from '../types';
import { getSavedConfig, fetchDisciplinaryCases, fetchCartas } from '../lib/supabase';
import { maskName, maskRut, getSemaphoricStyleCompact } from '../lib/utils';
import { getDisciplinaryStatusLabel } from './StudentTable';
import DocumentGenerator from './DocumentGenerator';

interface StudentDetailModalProps {
  student: Student;
  annotations: Annotation[];
  privacyMode: boolean;
  onClose: () => void;
  onAddAnnotations: (anns: Annotation[]) => void;
  onClearAnnotations: () => void;
  onTogglePrivacy: () => void;
}

export default function StudentDetailModal({
  student,
  annotations,
  privacyMode,
  onClose,
  onAddAnnotations,
  onClearAnnotations,
  onTogglePrivacy
}: StudentDetailModalProps) {
  // Input & parsing states
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter annotations
  const [activeTab, setActiveTab] = useState<'resumen' | 'subir_pdf' | 'anotaciones' | 'documentos'>('resumen');
  const [annotationTypeFilter, setAnnotationTypeFilter] = useState<'Todas' | 'Positivas' | 'Negativas'>('Todas');
  const [annotationSeverityFilter, setAnnotationSeverityFilter] = useState<'Todas' | 'Leves' | 'Graves / Críticas'>('Todas');

  // Document generation state variables
  const [docType, setDocType] = useState<'amonestacion' | 'compromiso' | 'derivacion' | 'compromiso_conductual'>('amonestacion');
  const [apoderadoName, setApoderadoName] = useState('');
  const [docObservations, setDocObservations] = useState('');
  const [selectedAnnotationsForDoc, setSelectedAnnotationsForDoc] = useState<string[]>([]);

  // Special "Carta de Compromiso Conductual 2026" states
  const [coordinatorName, setCoordinatorName] = useState('Sor María Inés');
  const [emittedBy, setEmittedBy] = useState('Coordinador de Convivencia Escolar');
  const [compromisoStatus, setCompromisoStatus] = useState<string>('Emitida');
  const [customCommitments, setCustomCommitments] = useState<string[]>([]);
  const [newCustomCommitment, setNewCustomCommitment] = useState('');
  const [authorizedDuplicate, setAuthorizedDuplicate] = useState(false);
  const [emittedCompromisos, setEmittedCompromisos] = useState<any[]>([]);
  const [activeCase, setActiveCase] = useState<any>(null);

  // Disciplinary measure state
  const DISCIPLINARY_MEASURES = [
    { value: 'sin_medida', label: 'Sin Medida Disciplinaria', description: 'Sin medidas activas registradas', color: 'slate' },
    { value: 'amonestacion', label: 'Carta de Amonestación', description: '1ra acumulación (5-9 anotaciones)', color: 'amber' },
    { value: 'compromiso', label: 'Carta de Compromiso Conductual', description: '2da acumulación (10-14 anotaciones)', color: 'orange' },
    { value: 'derivacion', label: 'Derivación a Convivencia Escolar', description: '3ra acumulación (15+ anotaciones)', color: 'rose' },
  ];

  const getCurrentMeasure = (): string => {
    if (student.annotations_count >= 15) return 'derivacion';
    if (student.annotations_count >= 10) return 'compromiso';
    if (student.annotations_count >= 5) return 'amonestacion';
    return 'sin_medida';
  };

  const [currentMeasure, setCurrentMeasure] = useState<string>(() => {
    const saved = localStorage.getItem(`disciplinary_measure_${student.id}`);
    return saved || getCurrentMeasure();
  });
  const [showMeasureChangeConfirm, setShowMeasureChangeConfirm] = useState<boolean>(false);
  const [pendingMeasure, setPendingMeasure] = useState<string | null>(null);
  const [measureChangeReason, setMeasureChangeReason] = useState<string>('');

  const handleMeasureChange = (newMeasure: string) => {
    if (newMeasure === currentMeasure) return;
    setPendingMeasure(newMeasure);
    setShowMeasureChangeConfirm(true);
  };

  const confirmMeasureChange = () => {
    if (!pendingMeasure) return;
    
    const measure = DISCIPLINARY_MEASURES.find(m => m.value === pendingMeasure);
    const transition: DisciplinaryTransition = {
      date: new Date().toISOString(),
      stageName: measure?.label || pendingMeasure,
      responsible: 'Sistema Disciplinario',
      comment: measureChangeReason || `Cambio de medida a ${measure?.label || pendingMeasure}.`
    };

    const updatedTransitions = [...transitions, transition];
    setTransitions(updatedTransitions);
    localStorage.setItem(`disciplinary_transitions_${student.id}`, JSON.stringify(updatedTransitions));

    setCurrentMeasure(pendingMeasure);
    localStorage.setItem(`disciplinary_measure_${student.id}`, pendingMeasure);

    setShowMeasureChangeConfirm(false);
    setPendingMeasure(null);
    setMeasureChangeReason('');
  };

  interface DisciplinaryTransition {
    date: string;
    stageName: string;
    responsible: string;
    comment?: string;
  }
  const [transitions, setTransitions] = useState<DisciplinaryTransition[]>([]);

  // Load transitions history on mount / student change
  React.useEffect(() => {
    const savedTrans = localStorage.getItem(`disciplinary_transitions_${student.id}`);
    if (savedTrans) {
      try {
        setTransitions(JSON.parse(savedTrans));
      } catch (e) {
        console.warn('Error loading transitions:', e);
      }
    }
  }, [student.id]);

  // Load emitted compromisos and active case on mount
  React.useEffect(() => {
    const loadData = async () => {
      // Load cartas from Supabase
      try {
        const config = getSavedConfig();
        const cartas = await fetchCartas(config, student.id);
        setEmittedCompromisos(cartas);
      } catch (e) {
        console.warn('Error loading cartas from Supabase:', e);
        // Fallback to localStorage
        const local = localStorage.getItem('convivencia_local_compromisos');
        if (local) {
          try {
            setEmittedCompromisos(JSON.parse(local));
          } catch (e2) {
            console.warn('Error loading emitted compromisos from localStorage:', e2);
          }
        }
      }

      // Load active disciplinary case
      try {
        const config = getSavedConfig();
        const cases = await fetchDisciplinaryCases(config);
        const studentCase = cases.find((c: any) => c.student_id === student.id);
        if (studentCase) {
          setActiveCase(studentCase);
        } else {
          setActiveCase(null);
        }
      } catch (e) {
        console.warn('Error loading active case from Supabase/cache:', e);
      }
    };
    loadData();
  }, [student.id]);

  // Automatically select all negative annotations initially for the document and switch to compromiso_conductual if >= 10 neg annotations
  React.useEffect(() => {
    const negativeAnns = annotations.filter(a => a.type === 'Negativa').map(a => a.id);
    setSelectedAnnotationsForDoc(negativeAnns);
    
    if (negativeAnns.length >= 10) {
      setDocType('compromiso_conductual');
    }
  }, [annotations]);

  // Privacy mask helpers
  const handleMaskName = (name: string) => maskName(name, privacyMode);
  const handleMaskRut = (rut?: string) => maskRut(rut, privacyMode);

  // Semaphoric Colors
  const statusStyle = getSemaphoricStyleCompact(student.annotations_count);

  // File drop/upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    setIsParsing(true);
    setErrorMessage(null);
    setParsingStatus('Iniciando lectura de archivo...');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        setParsingStatus('Preparando envío a Gemini AI...');
        const base64String = (reader.result as string).split(',')[1];
        
        setParsingStatus('Gemini está analizando la hoja de vida, extrayendo y categorizando anotaciones...');
        const response = await fetch('/api/parse-annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: base64String,
            mimeType: file.type || 'application/pdf',
            fileName: file.name
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Error al procesar el archivo');
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.annotations)) {
          setParsingStatus('¡Anotaciones reconocidas con éxito!');
          // Format & map parsed annotations to have student_id and unique ids
          const parsed: Annotation[] = data.annotations.map((ann: any, idx: number) => ({
            id: `ann-parsed-${Date.now()}-${idx}`,
            student_id: student.id,
            text: ann.text,
            date: ann.date || new Date().toISOString().split('T')[0],
            severity: ann.severity || 'Leve',
            registered_by: ann.registered_by || 'Inspectoría',
            type: ann.type === 'Positiva' ? 'Positiva' : 'Negativa'
          }));

          onAddAnnotations(parsed);
          setTimeout(() => {
            setIsParsing(false);
            setActiveTab('anotaciones');
          }, 800);
        } else {
          throw new Error('La respuesta de la IA no contiene una lista de anotaciones válida.');
        }

      } catch (error: any) {
        console.warn('File parsing error:', error);
        setErrorMessage(error.message || 'Error al procesar el documento. Intente de nuevo.');
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Error al leer el archivo físico.');
      setIsParsing(false);
    };
  };

  // Filtered annotations for the view
  const filteredAnnotations = annotations.filter(ann => {
    // Filter type
    if (annotationTypeFilter === 'Positivas' && ann.type !== 'Positiva') return false;
    if (annotationTypeFilter === 'Negativas' && ann.type !== 'Negativa') return false;

    // Filter severity
    if (annotationSeverityFilter === 'Leves' && ann.severity !== 'Leve') return false;
    if (annotationSeverityFilter === 'Graves / Críticas' && ann.severity === 'Leve') return false;

    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`p-2 rounded-xl border ${statusStyle.text} font-bold text-sm`}>
              {student.annotations_count} / {student.positive_annotations_count || 0}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                {handleMaskName(student.full_name)}
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {student.course_id}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                RUT: <span className="font-mono font-semibold">{handleMaskRut(student.rut)}</span> | Profesor Jefe: <span className="font-medium text-slate-700">{student.teacher_id}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePrivacy}
              className={`p-1.5 rounded-lg border text-xs font-semibold ${
                privacyMode ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500'
              }`}
              title="Alternar máscara de privacidad para NNA"
            >
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 text-sm">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all ${
              activeTab === 'resumen' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ficha
          </button>
          <button
            onClick={() => setActiveTab('subir_pdf')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all ${
              activeTab === 'subir_pdf' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Subir PDF
          </button>
          <button
            onClick={() => setActiveTab('anotaciones')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all ${
              activeTab === 'anotaciones' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Historial Cronológico ({annotations.length})
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`py-3 px-4 font-semibold border-b-2 transition-all ${
              activeTab === 'documentos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Documentos y Cartas
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">

          {/* TAB: Resumen & Upload */}
          {activeTab === 'resumen' && (
            <div className="space-y-6">

              {/* PANEL DE CAMBIO DE MEDIDA DISCIPLINARIA */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      Medida Disciplinaria Actual
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Seleccione y cambie la medida disciplinaria activa del estudiante.
                    </p>
                  </div>
                </div>

                {/* Current measure display */}
                <div className={`p-4 rounded-xl border-2 ${
                  currentMeasure === 'derivacion' ? 'bg-rose-50 border-rose-200' :
                  currentMeasure === 'compromiso' ? 'bg-orange-50 border-orange-200' :
                  currentMeasure === 'amonestacion' ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Medida Activa</span>
                  <span className={`text-sm font-black ${
                    currentMeasure === 'derivacion' ? 'text-rose-700' :
                    currentMeasure === 'compromiso' ? 'text-orange-700' :
                    currentMeasure === 'amonestacion' ? 'text-amber-700' :
                    'text-slate-700'
                  }`}>
                    {DISCIPLINARY_MEASURES.find(m => m.value === currentMeasure)?.label || 'Sin Medida'}
                  </span>
                </div>

                {/* Measure selection buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DISCIPLINARY_MEASURES.map((measure) => {
                    const isActive = currentMeasure === measure.value;
                    const borderColor = measure.color === 'rose' ? 'border-rose-300 bg-rose-50' :
                                       measure.color === 'orange' ? 'border-orange-300 bg-orange-50' :
                                       measure.color === 'amber' ? 'border-amber-300 bg-amber-50' :
                                       'border-slate-200 bg-slate-50';
                    const activeBg = measure.color === 'rose' ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-200' :
                                    measure.color === 'orange' ? 'bg-orange-100 border-orange-400 ring-2 ring-orange-200' :
                                    measure.color === 'amber' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200' :
                                    'bg-slate-100 border-slate-300 ring-2 ring-slate-200';
                    const textColor = measure.color === 'rose' ? 'text-rose-700' :
                                     measure.color === 'orange' ? 'text-orange-700' :
                                     measure.color === 'amber' ? 'text-amber-700' :
                                     'text-slate-700';

                    return (
                      <button
                        key={measure.value}
                        onClick={() => handleMeasureChange(measure.value)}
                        disabled={isActive}
                        className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          isActive
                            ? `${activeBg} cursor-default`
                            : `${borderColor} hover:shadow-md cursor-pointer hover:scale-[1.01]`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isActive ? textColor : 'text-slate-700'}`}>
                            {measure.label}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase bg-white/80 px-2 py-0.5 rounded-full border text-slate-600">
                              Activa
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{measure.description}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Confirmation dialog */}
                {showMeasureChangeConfirm && pendingMeasure && (
                  <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5 space-y-4 animate-fade-in">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-indigo-950 text-sm">
                          Confirmar Cambio de Medida
                        </h4>
                        <p className="text-xs text-indigo-800 leading-normal">
                          ¿Cambiar a <strong className="text-indigo-950 underline">
                            {DISCIPLINARY_MEASURES.find(m => m.value === pendingMeasure)?.label}
                          </strong>?
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-indigo-900 uppercase tracking-wider mb-1">
                        Observaciones del Cambio
                      </label>
                      <textarea
                        value={measureChangeReason}
                        onChange={(e) => setMeasureChangeReason(e.target.value)}
                        placeholder="Motivo del cambio de medida..."
                        rows={2}
                        className="w-full bg-white border border-indigo-250 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setShowMeasureChangeConfirm(false); setPendingMeasure(null); }}
                        className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={confirmMeasureChange}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}

                {/* History timeline */}
                {transitions.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Historial de Cambios
                    </h4>
                    <div className="relative pl-4 border-l-2 border-slate-200 space-y-3">
                      {transitions.slice().reverse().map((t, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-2xs" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-400">
                              {new Date(t.date).toLocaleDateString('es-CL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <p className="font-bold text-xs text-slate-800">{t.stageName}</p>
                            <p className="text-[11px] text-slate-500 leading-normal">{t.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Case Tracking Panel */}
              {activeCase && (
                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-xl p-5 shadow-xs space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider">Expediente Disciplinario Activo (IA)</h4>
                        <p className="text-[10px] text-indigo-600 font-medium mt-0.5">Sincronizado bajo RICE 2026 (Colegio Carmela Romero)</p>
                      </div>
                    </div>
                    <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Bajo Seguimiento
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs border-t border-indigo-200/40">
                    <div>
                      <span className="text-slate-400 font-medium text-[10px] uppercase block">Medida Inicial</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{activeCase.initial_measure}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[10px] uppercase block">Anotaciones IA</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{activeCase.annotations_count_detected} detectadas</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[10px] uppercase block">Registrado Por</span>
                      <span className="font-mono text-[11px] text-indigo-700 font-bold mt-0.5 block">{activeCase.created_by}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium text-[10px] uppercase block">Fecha de Registro</span>
                      <span className="font-semibold text-slate-700 mt-0.5 block">{new Date(activeCase.created_at).toLocaleString('es-CL')}</span>
                    </div>
                  </div>

                  {activeCase.analysis_summary && (
                    <div className="bg-white/80 border border-indigo-100 rounded-lg p-3 text-xs text-slate-700 space-y-1 mt-2.5">
                      <span className="font-black text-indigo-900 text-[10px] uppercase tracking-wider block">Resultado del Análisis de IA:</span>
                      <p className="leading-relaxed italic">"{activeCase.analysis_summary}"</p>
                      {activeCase.file_name && (
                        <span className="text-[10px] text-slate-400 block mt-1">
                          📁 Archivo de Respaldo: <span className="font-mono">{activeCase.file_name}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB: Subir PDF */}
          {activeTab === 'subir_pdf' && (
            <div className="space-y-4">
              {/* PDF Parser Drag & Drop Box */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Extractor de Anotaciones de Hoja de Vida (PDF / Word)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Sube la ficha o informe de anotaciones del estudiante. Gemini AI extraerá automáticamente las anotaciones positivas y negativas.
                    </p>
                  </div>
                  {annotations.length > 0 && (
                    <button
                      onClick={onClearAnnotations}
                      className="text-xs font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Limpiar registros
                    </button>
                  )}
                </div>

                {isParsing ? (
                  <div className="border border-slate-200 rounded-xl p-8 bg-slate-50 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-slate-700">{parsingStatus}</p>
                    <p className="text-[11px] text-slate-400">Analizando con Gemini 3.5-flash bajo normativa escolar chilena...</p>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                      isDragging 
                        ? 'border-indigo-600 bg-indigo-50/40' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Arrastra o selecciona un archivo PDF, DOCX o TXT</p>
                      <p className="text-[11px] text-slate-400 mt-1">Soporta informes del libro de clases digital, Lirmi o plataformas corporativas</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                    />
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-150 text-xs text-rose-700 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-800 space-y-1">
                  <p className="font-bold">¿Cómo funciona?</p>
                  <p className="leading-relaxed">
                    El extractor utiliza inteligencia artificial Gemini para leer documentos físicos escaneados y extraer automáticamente todas las anotaciones positivas y negativas del estudiante.
                  </p>
                  <p className="text-[10px] text-indigo-600 mt-2">
                    Formatos compatibles: PDF, DOCX, TXT, JPG, PNG
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Historial Cronológico */}
          {activeTab === 'anotaciones' && (
            <div className="space-y-4">
              
              {/* Filters header */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Filtrar por Tipo:</span>
                  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    {(['Todas', 'Positivas', 'Negativas'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setAnnotationTypeFilter(type)}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          annotationTypeFilter === type 
                            ? 'bg-white text-slate-800 shadow-2xs font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Gravedad:</span>
                  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                    {(['Todas', 'Leves', 'Graves / Críticas'] as const).map(sev => (
                      <button
                        key={sev}
                        onClick={() => setAnnotationSeverityFilter(sev)}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                          annotationSeverityFilter === sev 
                            ? 'bg-white text-slate-800 shadow-2xs font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* List of Annotations */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>Listado Cronológico de Anotaciones Reconocidas</span>
                  <span className="text-[10px] text-slate-400 font-mono">Mostrando {filteredAnnotations.length} de {annotations.length}</span>
                </div>
                
                <div className="divide-y divide-slate-150">
                  {filteredAnnotations.length > 0 ? (
                    filteredAnnotations.map((ann, idx) => {
                      const isPos = ann.type === 'Positiva';
                      const getSevColor = (sev: string) => {
                        if (isPos) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
                        if (sev === 'Leve') return 'bg-slate-100 text-slate-700 border-slate-200';
                        if (sev === 'Grave') return 'bg-yellow-50 text-yellow-800 border-yellow-200';
                        if (sev === 'Muy Grave') return 'bg-orange-50 text-orange-800 border-orange-200';
                        return 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
                      };

                      return (
                        <div key={ann.id} className={`p-4 flex flex-col sm:flex-row justify-between gap-4 transition-colors hover:bg-slate-50/40 ${isPos ? 'bg-emerald-50/10' : ''}`}>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono text-slate-400">#{filteredAnnotations.length - idx}</span>
                              
                              {/* Positive vs Negative Badge */}
                              {isPos ? (
                                <span className="px-2 py-0.5 rounded-sm text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase flex items-center gap-1">
                                  <Award className="w-2.5 h-2.5" />
                                  Mérito / Felicitación
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-sm text-[9px] font-extrabold bg-red-50 text-red-700 border border-red-200 uppercase flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Conducta Negativa
                                </span>
                              )}

                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${getSevColor(ann.severity)}`}>
                                {ann.severity}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> {ann.date}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">{ann.text}</p>
                          </div>
                          <div className="text-[10px] text-slate-400 italic shrink-0 self-start sm:self-center bg-slate-100/60 px-2 py-1 rounded">
                            Registrado por: {ann.registered_by}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-400 bg-slate-50/30">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold">No se encontraron anotaciones que coincidan con los filtros activos.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Usa la pestaña anterior para subir un PDF si esta hoja de vida está vacía.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Documentos y Cartas */}
          {activeTab === 'documentos' && (
            <DocumentGenerator
              student={student}
              annotations={annotations}
              privacyMode={privacyMode}
              currentStep={
                currentMeasure === 'derivacion' ? 4 :
                currentMeasure === 'compromiso' ? 3 :
                currentMeasure === 'amonestacion' ? 2 :
                1
              }
            />
          )}

        </div>

        {/* Footer bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-between">
          <span>Colegio Carmela Romero de Espinosa</span>
          <span>Extractor de Hojas de Vida</span>
        </div>

      </div>
    </div>
  );
}
