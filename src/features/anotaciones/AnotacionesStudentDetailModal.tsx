/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, memo } from 'react';
import { X, Eye, EyeOff, FileSearch } from 'lucide-react';
import { useUIStore } from '@/src/shared/lib/stores/uiStore';
import type { Annotation } from '@/src/types';
import { maskName, maskRut, getSemaphoricStyle, getCurrentDateStr } from '@/src/lib/anotacionesUtils';
import {
  STATUS_STYLE,
  TAB_ICONS,
  TAB_LABELS,
  type StudentInfo,
  type DisciplinayRecord,
  type ActiveTab,
} from './AnotacionesStudentDetailModal/constants';
import StudentSummaryTab from './AnotacionesStudentDetailModal/StudentSummaryTab';
import RevisionTab from './AnotacionesStudentDetailModal/RevisionTab';
import HistoryTab from './AnotacionesStudentDetailModal/HistoryTab';
import { useDisciplinaryData } from './AnotacionesStudentDetailModal/hooks/useDisciplinaryData';
import { usePdfProcessing } from './AnotacionesStudentDetailModal/hooks/usePdfProcessing';
import PdfViewer from './AnotacionesStudentDetailModal/PdfViewer';

const EMPTY_TEACHERS: Record<string, string> = {};

const Skeleton = memo(function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200 ${className}`} />;
});

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
  const [pdfViewPath, setPdfViewPath] = useState<string | null>(null);
  const cartasRef = useRef<unknown[]>([]);

  const {
    isDataLoading,
    activeCase,
    etapas,
    currentMeasure,
    transitions,
    cartas,
    setCurrentMeasure,
    setTransitions,
  } = useDisciplinaryData(student.id, student.full_name);

  const {
    isDragging,
    setIsDragging,
    isParsing,
    parsingStatus,
    errorMessage,
    parsedAnnotations,
    processPdfFile,
    handleDrop,
    handleFileSelect,
    handleRegisterParsed,
    setErrorMessage,
    pdfStoragePath,
    setParsingStatus,
    setIsParsing,
    setParsedAnnotations,
  } = usePdfProcessing(
    student.id,
    student,
    onAddAnnotations,
    cartasRef,
    (v) => { /* setEtapas is handled by hook */ },
    async (id) => { const { fetchCartas } = await import('@/src/services/cartas.service'); return fetchCartas(id); },
    async (id) => { const { fetchEtapas } = await import('@/src/services/etapas.service'); return fetchEtapas(id); }
  );

  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const setSelectedStudentForDocs = useUIStore((s) => s.setSelectedStudentForDocs);

  const handleGoToDocumentos = () => {
    setSelectedStudentForDocs(student.id);
    setCurrentView('documentos');
  };

  const negativeCount = annotations.filter((a) => a.type === 'Negativa').length || 0;
  const positiveCount = annotations.filter((a) => a.type === 'Positiva').length || 0;
  const semaphoric = getSemaphoricStyle(negativeCount);
  const statusKey = student.disciplinary_status || 'Verde';
  const statusInfo = STATUS_STYLE[statusKey] || STATUS_STYLE.Verde;
  const dateStr = getCurrentDateStr();

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
            pendingParsedCount={parsedAnnotations.length}
            onGoToRevisionTab={() => setActiveTab('revision')}
            onGoToDocumentos={handleGoToDocumentos}
          />
        );
      case 'revision':
        return (
          <RevisionTab
            student={student}
            cartas={cartas}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            isParsing={isParsing}
            parsingStatus={parsingStatus}
            errorMessage={errorMessage}
            setErrorMessage={setErrorMessage}
            parsedAnnotations={parsedAnnotations}
            pdfStoragePath={pdfStoragePath}
            onViewPdf={setPdfViewPath}
            onDrop={handleDrop}
            onFileSelect={handleFileSelect}
            onRegisterParsed={handleRegisterParsed}
          />
        );
      case 'historial':
        return <HistoryTab cartas={cartas} />;
      default:
        return null;
    }
  };

  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasOpened = useRef(false);

  useEffect(() => {
    if (!hasOpened.current && dialogRef.current) {
      dialogRef.current.showModal();
      hasOpened.current = true;
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 max-h-full max-w-full bg-transparent p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center"
      style={{ border: 'none' }}
      aria-label={`Detalles de ${student.full_name}`}
    >
      <div className="relative w-full max-w-3xl animate-scale-in rounded-2xl bg-white shadow-2xl my-4 mx-4">
        <div className="border-b border-neutral-100 px-4 py-4 sm:px-6">
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
                    {statusInfo.label}
                  </span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-neutral-500">{negativeCount} neg</span>
                  <span className="text-emerald-600 font-semibold">{positiveCount} pos</span>
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
                className="rounded-lg p-2 text-neutral-400 transition-colors duration-200 hover:rotate-90 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white px-4 pb-2 sm:px-6">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100/60 p-1">
            {(Object.keys(TAB_ICONS) as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 font-medium text-sm transition-colors duration-200 ${
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

        <div className="h-[480px] overflow-y-auto p-4 sm:p-6">{renderTabContent()}</div>
      </div>
      {pdfViewPath && (
        <PdfViewer pdfPath={pdfViewPath} onClose={() => setPdfViewPath(null)} />
      )}
    </dialog>
  );
}