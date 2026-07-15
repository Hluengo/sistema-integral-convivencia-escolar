/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Upload, FileText, History, ScrollText, Shield,
  Download, Eye, EyeOff, AlertTriangle, CheckCircle2, Plus, Trash2,
} from 'lucide-react';
import type { Annotation } from '../../types';
import { maskName, maskRut, getSemaphoricStyle, getCurrentDateStr } from '../../lib/anotacionesUtils';
import { supabase, fetchCartas, saveCarta, fetchEtapas, saveEtapa } from '../../lib/supabase';
import AnotacionesDocumentGenerator from './AnotacionesDocumentGenerator';

const EMPTY_TEACHERS: Record<string, string> = {};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

interface AnotacionesStudentDetailModalProps {
  student: {
    id: string;
    full_name: string; course_id: string; teacher_id: string;
    annotations_count?: number; positive_annotations_count?: number;
    last_annotation_date?: string; disciplinary_status?: string; rut?: string; course_name?: string;
  };
  annotations: Annotation[];
  privacyMode: boolean;
  onClose: () => void;
  onAddAnnotations: (studentId: string, annotations: any[]) => void;
  onClearAnnotations: (studentId: string) => void;
  onTogglePrivacy?: () => void;
  teachers?: Record<string, string>;
}

type ActiveTab = 'resumen' | 'subir_pdf' | 'historial' | 'documentos';


const SEVERITY_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  Leve: { bg: 'bg-yellow-50', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  Grave: { bg: 'bg-orange-50', text: 'text-orange-800', dot: 'bg-orange-500' },
  'Muy Grave': { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500' },
  'Gravísima': { bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-600' },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  Verde: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Verde - Buen Comportamiento' },
  Amarillo: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Amarillo - Advertencia' },
  Naranja: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Naranja - Compromiso' },
  Rojo: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Rojo - Alerta Crítica' },
};

const TAB_ICONS: Record<ActiveTab, React.ReactNode> = {
  resumen: <FileText className="w-4 h-4" />,
  subir_pdf: <Upload className="w-4 h-4" />,
  historial: <History className="w-4 h-4" />,
  documentos: <ScrollText className="w-4 h-4" />,
};

const TAB_LABELS: Record<ActiveTab, string> = {
  resumen: 'Ficha / Resumen',
  subir_pdf: 'Subir PDF',
  historial: 'Historial',
  documentos: 'Documentos',
};
export default function AnotacionesStudentDetailModal({
  student,
  annotations,
  privacyMode,
  onClose,
  onAddAnnotations,
  onClearAnnotations,
  onTogglePrivacy,
  teachers = EMPTY_TEACHERS,
}: AnotacionesStudentDetailModalProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('resumen');



  // PDF upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedAnnotations, setParsedAnnotations] = useState<any[]>([]);

  // Disciplinary journey state
  const [currentMeasure, setCurrentMeasure] = useState<string>('');
  const [transitions, setTransitions] = useState<any[]>([]);
  const [activeCase, setActiveCase] = useState<any | null>(null);
  const cartasRef = useRef<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  const isLoadingDataRef = useRef(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Derived data
  const negativeCount = annotations.filter((a) => a.type === 'Negativa').length;
  const semaphoric = getSemaphoricStyle(negativeCount);
  const statusKey: string = student.disciplinary_status || 'Verde';
  const statusInfo = STATUS_STYLE[statusKey] || STATUS_STYLE.Verde;
  const dateStr = getCurrentDateStr();
  // Load data on mount
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      isLoadingDataRef.current = true;
      try {
        const [cartasData, etapasData] = await Promise.all([
          fetchCartas(student.id),
          fetchEtapas(student.id),
        ]);

        if (!cancelled) {
          cartasRef.current = cartasData;
          setEtapas(etapasData);
        }

        const measureKey = `disciplinary_measure_${student.id}`;
        const transitionsKey = `disciplinary_transitions_${student.id}`;
        const storedMeasure = localStorage.getItem(measureKey);
        const storedTransitions = localStorage.getItem(transitionsKey);

        if (!cancelled) {
          if (storedMeasure) setCurrentMeasure(storedMeasure);
          if (storedTransitions) {
            try { setTransitions(JSON.parse(storedTransitions)); }
            catch { /* ignore corrupt data */ }
          }
        }

        if (!cancelled) {
          const { data: causasData } = await supabase
            .from('causas')
            .select('*')
            .eq('estudiante_nombre', student.full_name)
            .order('fecha_ultima_actualizacion', { ascending: false })
            .limit(1);

          if (causasData && causasData.length > 0) {
            setActiveCase(causasData[0]);
          }
        }
      } catch (err) {
        console.error('Error loading disciplinary data:', err);
      } finally {
        if (!cancelled) isLoadingDataRef.current = false;
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [student.id, student.full_name]);
  // PDF drag-and-drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const processPdfFile = useCallback(async (file: File) => {
    setIsParsing(true);
    setParsingStatus('Leyendo archivo PDF...');
    setErrorMessage(null);
    setParsedAnnotations([]);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      const base64Data = btoa(binary);

      setParsingStatus('Enviando a procesamiento...');

      const response = await fetch('/api/parse-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileData: base64Data,
          studentId: student.id,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error del servidor (' + response.status + ')');
      }

      const result = await response.json();

      if (result.annotations && result.annotations.length > 0) {
        setParsedAnnotations(result.annotations);
        setParsingStatus('Se detectaron ' + result.annotations.length + ' anotaciones. Revisa los datos antes de registrar.');
      } else {
        setParsingStatus('No se detectaron anotaciones en el PDF. Revisa que el archivo contenga datos de hoja de vida.');
      }
    } catch (err: any) {
      console.error('Error parsing PDF:', err);
      setErrorMessage(err.message || 'Error al procesar el archivo PDF. Intenta nuevamente.');
      setParsingStatus('Error al procesar el archivo');
    } finally {
      setIsParsing(false);
    }
  }, [student.id]);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Solo se aceptan archivos PDF. Arrastra un archivo PDF valido.');
      return;
    }
    await processPdfFile(file);
  }, [processPdfFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Solo se aceptan archivos PDF. Selecciona un archivo PDF valido.');
      return;
    }
    await processPdfFile(file);
    e.target.value = '';
  }, [processPdfFile]);
  const handleRegisterParsedAnnotations = async () => {
    if (parsedAnnotations.length === 0) return;
    try {
      setParsingStatus('Registrando anotaciones en la base de datos...');
      const annotationsToSave = parsedAnnotations.map((ann: any) => ({
        student_id: student.id,
        observation: ann.text || ann.observation || '',
        severity: ann.severity || 'Leve',
        type: ann.type || 'Negativa',
        registered_by: ann.registered_by || 'Inspectoria',
      }));

      for (const ann of annotationsToSave) {
        const { error } = await supabase
          .from('inspectorate_records')
          .insert({
            student_id: ann.student_id,
            observation: ann.observation,
            severity: ann.severity,
            type: ann.type,
            registered_by: ann.registered_by,
          });
        if (error) {
          console.error('Error saving parsed annotation:', error);
          setErrorMessage('Error al guardar anotacion: ' + error.message);
          setParsingStatus('Algunas anotaciones no se pudieron registrar.');
          return;
        }
      }

      onAddAnnotations(student.id, annotationsToSave);
      setParsingStatus(annotationsToSave.length + ' anotaciones registradas exitosamente.');
      setParsedAnnotations([]);

      const [cartasData, etapasData] = await Promise.all([
        fetchCartas(student.id),
        fetchEtapas(student.id),
      ]);
      cartasRef.current = cartasData;
      setEtapas(etapasData);
    } catch (err: any) {
      console.error('Error registering parsed annotations:', err);
      setErrorMessage(err.message || 'Error al registrar las anotaciones.');
      setParsingStatus('Error al registrar');
    }
  };
  // Render: Resumen tab
  const renderResumenTab = () => (
    <div className="space-y-5">
      {/* Current disciplinary measure */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            Medida Disciplinaria Actual
          </h3>
          <span className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold " + semaphoric.badge}>
            <span className={"inline-block w-2 h-2 rounded-full " + semaphoric.dot} />
            {student.disciplinary_status}
          </span>
        </div>
        {currentMeasure ? (
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
            <p className="text-sm text-neutral-700 font-medium">{currentMeasure}</p>
            <p className="text-xs text-neutral-400 mt-1">Ultima actualizacion: {dateStr}</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-400 italic">No hay una medida disciplinaria activa registrada.</p>
        )}
      </div>

      {/* Status and counts summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Estado General</p>
          <div className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold " + statusInfo.bg + " " + statusInfo.text}>
            <span className={"inline-block w-2 h-2 rounded-full " + semaphoric.dot} />
            {statusInfo.label}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Anotaciones Negativas</p>
          <div className="flex items-baseline gap-2">
            <span className={"text-2xl font-extrabold " + semaphoric.text}>{negativeCount}</span>
            <span className="text-xs text-neutral-400">registros</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Anotaciones Positivas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">{student.positive_annotations_count ?? 0}</span>
            <span className="text-xs text-neutral-400">registros</span>
          </div>
        </div>
      </div>
      {/* Active case tracking */}
      {activeCase && (
        <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-neutral-900">Caso Activo</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-neutral-500">ID del caso:</span> <span className="font-medium text-neutral-800">{activeCase.id}</span></div>
            <div><span className="text-neutral-500">Estado:</span> <span className="font-medium text-neutral-800">{activeCase.estado_actual}</span></div>
            <div><span className="text-neutral-500">Tipo de infraccion:</span> <span className="font-medium text-neutral-800">{activeCase.tipo_infraccion}</span></div>
            <div><span className="text-neutral-500">Ultima actualizacion:</span> <span className="font-medium text-neutral-800">{formatDate(activeCase.fecha_ultima_actualizacion)}</span></div>
          </div>
        </div>
      )}

      {/* Transitions */}
      {transitions.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-indigo-600" />
            Historial de Transiciones
          </h3>
          <div className="space-y-3">
            {transitions.map((t, i) => (
              <div key={t.id || i} className="flex items-start gap-3 pb-3 border-b border-neutral-100 last:border-b-0 last:pb-0">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-indigo-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800">
                    {(t.from || 'Inicio') + ' -> ' + (t.to || t.stage_name || '(sin destino)')}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {(t.date ? formatDate(t.date) : t.transition_date ? formatDate(t.transition_date) : 'Fecha no disponible') + (t.responsible ? ' - ' + t.responsible : '')}
                  </p>
                  {t.comment && <p className="text-xs text-neutral-500 mt-1 italic">{t.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Etapas disciplinarias */}
      {etapas.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            Etapas del Proceso Disciplinario
          </h3>
          <div className="space-y-2">
            {etapas.map((etapa) => (
              <div key={etapa.id} className="flex items-center justify-between bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    {etapa.step_number}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{etapa.stage_name}</p>
                    <p className="text-xs text-neutral-400">
                      {formatDate(etapa.transition_date)}{etapa.responsible ? ' - ' + etapa.responsible : ''}
                    </p>
                  </div>
                </div>
                {etapa.comment && (
                  <p className="text-xs text-neutral-500 max-w-[200px] text-right truncate" title={etapa.comment}>{etapa.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data state */}
      {!currentMeasure && transitions.length === 0 && etapas.length === 0 && !activeCase && (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs text-center">
          <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No hay informacion adicional disponible del proceso disciplinario.</p>
          <p className="text-xs text-neutral-400 mt-1">Los datos apareceran a medida que se registren medidas y transiciones.</p>
        </div>
      )}
    </div>
  );
  // Render: Subir PDF tab
  const renderSubirPdfTab = () => (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        ref={dropZoneRef}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={
          'relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ' +
          (isDragging ? 'border-indigo-400 bg-indigo-50/50 shadow-lg' : 'border-neutral-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/20') +
          (isParsing ? ' pointer-events-none opacity-60' : '')
        }
      >
        <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileSelect} className="hidden" />
        <div className="flex flex-col items-center gap-3">
          {isParsing ? (
            <>
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm font-medium text-indigo-600">{parsingStatus}</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-neutral-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700">Arrastra un PDF de Hoja de Vida o haz clic para seleccionar</p>
                <p className="text-xs text-neutral-400 mt-1">Solo archivos PDF - Maximo 10 MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Parsing status */}
      {parsingStatus && !isParsing && (
        <div className={
          'rounded-2xl border p-4 text-sm ' +
          (parsingStatus.includes('exitosamente') || parsingStatus.includes('detectaron')
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : parsingStatus.includes('Error')
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-neutral-50 border-neutral-200 text-neutral-700')
        }>
          <div className="flex items-center gap-2">
            {parsingStatus.includes('exitosamente') || parsingStatus.includes('detectaron') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : parsingStatus.includes('Error') ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            )}
            <span>{parsingStatus}</span>
          </div>
        </div>
      )}
      {/* Error message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
            <button type="button" aria-label="Cerrar mensaje" onClick={() => setErrorMessage(null)} className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detected annotations preview */}
      {parsedAnnotations.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
          <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Anotaciones Detectadas ({parsedAnnotations.length})
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {annotations.map((ann: any, index: number) => {
              const severity = ann.severity || 'Leve';
              const badge = SEVERITY_BADGE[severity] || SEVERITY_BADGE.Leve;
              return (
                <div key={ann.id || ann.text || ann.observation || index} className="flex items-start gap-3 bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                  <span className={"flex-shrink-0 w-2 h-2 mt-1.5 rounded-full " + badge.dot} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider " + badge.bg + " " + badge.text}>
                        {severity}
                      </span>
                      <span className="text-[10px] font-medium text-neutral-400 uppercase">{ann.type || 'Negativa'}</span>
                    </div>
                    <p className="text-sm text-neutral-700">{ann.text || ann.observation || 'Sin descripcion'}</p>
                    {ann.date && <p className="text-xs text-neutral-400 mt-1">{formatDate(ann.date)}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleRegisterParsedAnnotations}
            disabled={isParsing || parsedAnnotations.length === 0}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Registrar {parsedAnnotations.length} Anotacione{parsedAnnotations.length === 1 ? 'n' : 's'}
          </button>
        </div>
      )}
    </div>
  );
  // Render: Historial tab
  const renderHistorialTab = () => (
    <div className="space-y-5">
      {/* Annotations list */}
      {annotations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs text-center">
          <ScrollText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">
            Este estudiante no tiene anotaciones registradas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {annotations.map((ann) => {
            const badge = SEVERITY_BADGE[ann.severity] || SEVERITY_BADGE.Leve;
            return (
              <div key={ann.id} className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={"inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider " + badge.bg + " " + badge.text}>
                        <span className={"inline-block w-1.5 h-1.5 rounded-full " + badge.dot} />
                        {ann.severity}
                      </span>
                      <span className={"text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full " + (ann.type === 'Positiva' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                        {ann.type}
                      </span>
                      <span className="text-xs text-neutral-400">{formatDate(ann.date)}</span>
                    </div>
                    <p className="text-sm text-neutral-700 leading-relaxed">{ann.text}</p>
                  </div>
                </div>
                {ann.registered_by && (
                  <div className="mt-2 pt-2 border-t border-neutral-100">
                    <p className="text-xs text-neutral-400">Registrado por: <span className="font-medium text-neutral-600">{ann.registered_by}</span></p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  // Render: Documentos tab
  const renderDocumentosTab = () => (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
      <AnotacionesDocumentGenerator
        student={student}
        annotations={annotations}
        privacyMode={privacyMode}
        teachers={teachers}
      />
    </div>
  );

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumen': return renderResumenTab();
      case 'subir_pdf': return renderSubirPdfTab();
      case 'historial': return renderHistorialTab();
      case 'documentos': return renderDocumentosTab();
      default: return null;
    }
  };
  // Main render
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-4 pb-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-5xl mx-4 bg-neutral-50 rounded-3xl shadow-2xl border border-neutral-200/60 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-neutral-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-extrabold text-indigo-700">
                  {student.full_name.split(' ').map((n) => n.charAt(0)).slice(0, 2).join('').toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-neutral-900 truncate">
                  {maskName(student.full_name, privacyMode)}
                </h2>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500 flex-wrap">
                  <span>{student.course_name || student.course_id || 'Sin curso'}</span>
                  {student.rut && (<><span className="text-neutral-300">|</span><span>{maskRut(student.rut, privacyMode)}</span></>)}
                  <span className="text-neutral-300">|</span>
                  <span className={"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold " + statusInfo.bg + " " + statusInfo.text}>
                    <span className={"inline-block w-1.5 h-1.5 rounded-full " + semaphoric.dot} />
                    {student.disciplinary_status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={privacyMode ? 'Desactivar privacidad' : 'Activar privacidad'} onClick={onTogglePrivacy}
                className="p-2 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title={privacyMode ? 'Desactivar privacidad' : 'Activar privacidad'}>
                {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button type="button" aria-label="Cerrar" onClick={onClose}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        {/* Tab bar */}
        <div className="bg-white border-b border-neutral-200 px-6">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {(Object.keys(TAB_ICONS) as ActiveTab[]).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' +
                  (activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300')
                }>
                {TAB_ICONS[tab]}
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

