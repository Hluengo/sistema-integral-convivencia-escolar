/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import type { Annotation } from '../../types';
import { maskName, maskRut, getSemaphoricStyle, getCurrentDateStr } from '../../lib/anotacionesUtils';
import { supabase } from '../../lib/supabase';
import { fetchCartas } from '../../services/cartas.service';
import { fetchEtapas } from '../../services/etapas.service';
import AnotacionesDocumentGenerator from './AnotacionesDocumentGenerator';
import {
  STATUS_STYLE,
  TAB_ICONS,
  TAB_LABELS,
  type StudentInfo,
  type DisciplinayRecord,
  type ActiveTab,
} from './AnotacionesStudentDetailModal/constants';
import StudentSummaryTab from './AnotacionesStudentDetailModal/StudentSummaryTab';
import UploadPdfTab from './AnotacionesStudentDetailModal/UploadPdfTab';
import HistoryTab from './AnotacionesStudentDetailModal/HistoryTab';

const EMPTY_TEACHERS: Record<string, string> = {};

interface AnotacionesStudentDetailModalProps {
  student: StudentInfo;
  annotations: Annotation[];
  privacyMode: boolean;
  onClose: () => void;
  onAddAnnotations: (studentId: string, annotations: unknown[]) => void;
  onClearAnnotations: (studentId: string) => void;
  onTogglePrivacy?: () => void;
  teachers?: Record<string, string>;
}

const Skeleton = memo(function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200 ${className}`} />;
});

export default function AnotacionesStudentDetailModal({
  student,
  annotations,
  privacyMode,
  onClose,
  onAddAnnotations,
  onClearAnnotations: _onClearAnnotations,
  onTogglePrivacy,
  teachers = EMPTY_TEACHERS,
}: AnotacionesStudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('resumen');

  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedAnnotations, setParsedAnnotations] = useState<unknown[]>([]);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [currentMeasure, setCurrentMeasure] = useState('');
  const [transitions, setTransitions] = useState<DisciplinayRecord[]>([]);
  const [activeCase, setActiveCase] = useState<DisciplinayRecord | null>(null);
  const cartasRef = useRef<unknown[]>([]);
  const [etapas, setEtapas] = useState<DisciplinayRecord[]>([]);

  const negativeCount = annotations.filter((a) => a.type === 'Negativa').length;
  const semaphoric = getSemaphoricStyle(negativeCount);
  const statusKey = student.disciplinary_status || 'Verde';
  const statusInfo = STATUS_STYLE[statusKey] || STATUS_STYLE.Verde;
  const dateStr = getCurrentDateStr();

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsDataLoading(true);
      try {
        const [cartasData, etapasData, causasResult] = await Promise.all([
          fetchCartas(student.id),
          fetchEtapas(student.id),
          supabase
            .from('causas')
            .select('id,estado_actual,tipo_infraccion,fecha_ultima_actualizacion')
            .eq('estudiante_nombre', student.full_name)
            .order('fecha_ultima_actualizacion', { ascending: false })
            .limit(1),
        ]);

        if (cancelled) return;

        cartasRef.current = cartasData;
        setEtapas(etapasData);

        if (causasResult.data && causasResult.data.length > 0) {
          setActiveCase(causasResult.data[0] as DisciplinayRecord);
        }

        const measureKey = `disciplinary_measure_${student.id}`;
        const transitionsKey = `disciplinary_transitions_${student.id}`;
        const storedMeasure = localStorage.getItem(measureKey);
        const storedTransitions = localStorage.getItem(transitionsKey);

        if (storedMeasure) setCurrentMeasure(storedMeasure);
        if (storedTransitions) {
          try { setTransitions(JSON.parse(storedTransitions)); } catch { /* ignore */ }
        }
      } catch (err) {
        console.error('Error loading disciplinary data:', err);
      } finally {
        if (!cancelled) {
          setIsDataLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [student.id, student.full_name]);

  const processPdfFile = useCallback(
    async (file: File) => {
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
          body: JSON.stringify({ fileName: file.name, fileData: base64Data, studentId: student.id }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Error del servidor (${response.status})`);
        }

        const result = await response.json();

        if (result.annotations && result.annotations.length > 0) {
          setParsedAnnotations(result.annotations);
          setParsingStatus(`Se detectaron ${result.annotations.length} anotaciones. Revisa los datos antes de registrar.`);
        } else {
          setParsingStatus('No se detectaron anotaciones en el PDF. Revisa que el archivo contenga datos de hoja de vida.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al procesar el archivo PDF.';
        console.error('Error parsing PDF:', err);
        setErrorMessage(msg);
        setParsingStatus('Error al procesar el archivo');
      } finally {
        setIsParsing(false);
      }
    },
    [student.id]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length === 0) return;
      const file = files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Solo se aceptan archivos PDF.');
        return;
      }
      await processPdfFile(file);
    },
    [processPdfFile]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Solo se aceptan archivos PDF.');
        return;
      }
      await processPdfFile(file);
      e.target.value = '';
    },
    [processPdfFile]
  );

  const handleRegisterParsed = useCallback(async () => {
    if (parsedAnnotations.length === 0) return;
    try {
      setParsingStatus('Registrando anotaciones en la base de datos...');
      const annotationsToSave = parsedAnnotations.map((ann: unknown) => {
        const a = ann as Record<string, string | undefined>;
        return {
          student_id: student.id,
          observation: a.text || a.observation || '',
          severity: a.severity || 'Leve',
          type: a.type || 'Negativa',
          registered_by: a.registered_by || 'Inspectoria',
        };
      });

      for (const ann of annotationsToSave) {
        const { error } = await supabase.from('inspectorate_records').insert(ann);
        if (error) {
          console.error('Error saving parsed annotation:', error);
          setErrorMessage(`Error al guardar anotacion: ${error.message}`);
          setParsingStatus('Algunas anotaciones no se pudieron registrar.');
          return;
        }
      }

      onAddAnnotations(student.id, annotationsToSave);
      setParsingStatus(`${annotationsToSave.length} anotaciones registradas exitosamente.`);
      setParsedAnnotations([]);

      const [cartasData, etapasData] = await Promise.all([
        fetchCartas(student.id),
        fetchEtapas(student.id),
      ]);
      cartasRef.current = cartasData;
      setEtapas(etapasData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar las anotaciones.';
      console.error('Error registering parsed annotations:', err);
      setErrorMessage(msg);
      setParsingStatus('Error al registrar');
    }
  }, [parsedAnnotations, student.id, onAddAnnotations]);

  const renderTabContent = () => {
    if (isDataLoading) {
      return (
        <div className="space-y-4 p-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    switch (activeTab) {
      case 'resumen':
        return (
          <StudentSummaryTab
            student={student}
            annotations={annotations}
            currentMeasure={currentMeasure}
            transitions={transitions}
            etapas={etapas}
            activeCase={activeCase}
            dateStr={dateStr}
          />
        );
      case 'subir_pdf':
        return (
          <UploadPdfTab
            student={student}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            isParsing={isParsing}
            parsingStatus={parsingStatus}
            errorMessage={errorMessage}
            setErrorMessage={setErrorMessage}
            parsedAnnotations={parsedAnnotations}
            onDrop={handleDrop}
            onFileSelect={handleFileSelect}
            onRegisterParsed={handleRegisterParsed}
          />
        );
      case 'historial':
        return <HistoryTab annotations={annotations} />;
      case 'documentos':
        return (
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
            <AnotacionesDocumentGenerator
              student={student}
              annotations={annotations}
              privacyMode={privacyMode}
              teachers={teachers}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <button type="button" className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-label="Cerrar" onClick={onClose} />
      <div className="relative w-full max-w-3xl animate-scale-in rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label={`Detalles de ${student.full_name}`}>
        <div className="border-b border-neutral-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <span className="font-bold text-brand-600 text-sm">{student.full_name.charAt(0)}</span>
              </div>
              <div>
                <h2 className="font-bold text-neutral-900 text-base">
                  {privacyMode ? maskName(student.full_name, privacyMode) : student.full_name}
                </h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-neutral-500 text-xs">
                  <span>{student.course_name || student.course_id || 'Sin curso'}</span>
                  {student.rut && (
                    <>
                      <span className="text-neutral-300">|</span>
                      <span>{maskRut(student.rut, privacyMode)}</span>
                    </>
                  )}
                  <span className="text-neutral-300">|</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold text-[10px] ${statusInfo.bg} ${statusInfo.text}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full${semaphoric.dot}`} />
                    {student.disciplinary_status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={privacyMode ? 'Desactivar privacidad' : 'Activar privacidad'}
                onClick={onTogglePrivacy}
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
                title={privacyMode ? 'Desactivar privacidad' : 'Activar privacidad'}
              >
                {privacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="rounded-lg p-2 text-neutral-400 transition-all duration-200 hover:rotate-90 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white px-6 pb-2">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100/60 p-1">
            {(Object.keys(TAB_ICONS) as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-neutral-500 hover:bg-white/50 hover:text-neutral-700'
                }`}
              >
                {TAB_ICONS[tab]}
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">{renderTabContent()}</div>
      </div>
    </div>
  );
}
