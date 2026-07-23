/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import type { Annotation } from '@/src/types';
import { maskName, maskRut } from '@/src/lib/anotacionesUtils';
import { getDisciplinaryStage, type LetterDocType } from '@/src/shared/lib/domain/disciplinaryStage';
import { STAGE_STYLE, TAB_ICONS, TAB_LABELS, type ActiveTab, type StudentInfo } from './AnotacionesStudentDetailModal/constants';
import StudentSummaryTab from './AnotacionesStudentDetailModal/StudentSummaryTab';
import RevisionTab from './AnotacionesStudentDetailModal/RevisionTab';
import HistoryTab from './AnotacionesStudentDetailModal/HistoryTab';
import CartasTab from './AnotacionesStudentDetailModal/CartasTab';
import { useDisciplinaryData } from './AnotacionesStudentDetailModal/hooks/useDisciplinaryData';

const Skeleton = memo(function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200 ${className}`} />;
});

interface AnotacionesStudentDetailModalProps {
  student: StudentInfo;
  annotations: Annotation[];
  privacyMode: boolean;
  onClose: () => void;
  onClearAnnotations: (studentId: string) => void;
  onTogglePrivacy?: () => void;
  teachers?: Record<string, string>;
}

export default function AnotacionesStudentDetailModal({
  student,
  annotations,
  privacyMode,
  onClose,
  onTogglePrivacy,
  teachers,
}: AnotacionesStudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('estado');
  const [pendingCartaSuggestion, setPendingCartaSuggestion] = useState<{
    docType: LetterDocType;
    negativeCount: number;
    source: 'pdf' | 'supabase';
  } | null>(null);
  const disciplinaryData = useDisciplinaryData(student.id);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasOpened = useRef(false);

  const fallbackCounts = useMemo(() => {
    if (annotations.length === 0) {
      return {
        negativas: Number(student.annotations_count) || 0,
        positivas: Number(student.positive_annotations_count) || 0,
        informativas: 0,
      };
    }
    return annotations.reduce(
      (acc, annotation) => {
        if (annotation.type === 'Negativa') acc.negativas += 1;
        if (annotation.type === 'Positiva') acc.positivas += 1;
        if (annotation.type === 'Información') acc.informativas += 1;
        return acc;
      },
      { negativas: 0, positivas: 0, informativas: 0 }
    );
  }, [annotations, student.annotations_count, student.positive_annotations_count]);

  const counts = disciplinaryData.annotations.length > 0 ? disciplinaryData.counts : fallbackCounts;
  const effectiveAnnotations = disciplinaryData.annotations.length > 0 ? disciplinaryData.annotations : annotations;
  const stage = getDisciplinaryStage(counts.negativas);
  const stageStyle = STAGE_STYLE[stage.key];

  useEffect(() => {
    if (!hasOpened.current && dialogRef.current) {
      dialogRef.current.showModal();
      hasOpened.current = true;
    }
  }, []);

  const renderTabContent = () => {
    if (disciplinaryData.isDataLoading) {
      return (
        <div className="space-y-4 p-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-36 w-full" />
        </div>
      );
    }

    switch (activeTab) {
      case 'estado':
        return (
          <StudentSummaryTab
            student={student}
            counts={counts}
            currentCarta={disciplinaryData.currentCarta}
            lastAnalysis={disciplinaryData.lastAnalysis}
            onGoToRevisionTab={() => setActiveTab('revisar_pdf')}
            onGoToCartasTab={() => setActiveTab('cartas')}
          />
        );
      case 'revisar_pdf':
        return (
          <RevisionTab
            student={student}
            counts={counts}
            currentCarta={disciplinaryData.currentCarta}
            onConfirmed={disciplinaryData.refresh}
            onGoToCarta={(docType, negativeCount) => {
              setPendingCartaSuggestion({ docType, negativeCount, source: 'pdf' });
              setActiveTab('cartas');
            }}
          />
        );
      case 'cartas':
        return (
          <CartasTab
            student={student}
            annotations={effectiveAnnotations}
            cartas={disciplinaryData.cartas}
            counts={counts}
            currentCarta={disciplinaryData.currentCarta}
            pendingSuggestion={pendingCartaSuggestion}
            privacyMode={privacyMode}
            teachers={teachers}
            onRefresh={disciplinaryData.refresh}
          />
        );
      case 'historial':
        return (
          <HistoryTab
            cartas={disciplinaryData.cartas}
            documentAnalyses={disciplinaryData.documentAnalyses}
            etapas={disciplinaryData.etapas}
            processes={disciplinaryData.processes}
            files={disciplinaryData.files}
            detectedAnnotations={disciplinaryData.detectedAnnotations}
            letterOutputEvents={disciplinaryData.letterOutputEvents}
            cartaEvents={disciplinaryData.cartaEvents}
          />
        );
      default:
        return null;
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 max-h-full max-w-full bg-transparent p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex open:items-center open:justify-center"
      style={{ border: 'none' }}
      aria-label={`Ficha disciplinaria de ${student.full_name}`}
    >
      <div className="relative my-4 mx-4 w-full max-w-6xl animate-scale-in rounded-xl bg-white shadow-2xl">
        <div className="border-b border-neutral-100 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <span className="text-sm font-bold text-brand-600">{student.full_name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-neutral-900">
                  {privacyMode ? maskName(student.full_name, privacyMode) : student.full_name}
                </h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>{student.course_name || student.course_id || 'Sin curso'}</span>
                  {student.rut && <span>{maskRut(student.rut, privacyMode)}</span>}
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${stageStyle.bg} ${stageStyle.text}`}>
                    {stage.label}
                  </span>
                  <span>{counts.negativas} negativas</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={privacyMode ? 'Desactivar privacidad' : 'Activar privacidad'} onClick={onTogglePrivacy} className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-brand-50 hover:text-brand-600" title={privacyMode ? 'Desactivar privacidad' : 'Activar privacidad'}>
                {privacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600">
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
                className={`flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab ? 'bg-white text-brand-700 shadow-sm' : 'text-neutral-500 hover:bg-white/50 hover:text-neutral-700'
                }`}
              >
                {TAB_ICONS[tab]}
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[70vh] overflow-y-auto p-4 sm:p-6">{renderTabContent()}</div>
      </div>
    </dialog>
  );
}
