/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Annotation } from '@/src/shared/lib/types';
import { maskName, maskRut } from '@/src/shared/lib/anotacionesUtils';
import { getCurrentSchoolYear, getYearInChile } from '@/src/shared/lib/dateUtils';
import {
  getDisciplinaryStage,
  type LetterDocType,
} from '@/src/shared/lib/domain/disciplinaryStage';
import {
  STAGE_STYLE,
  TAB_ICONS,
  TAB_LABELS,
  type ActiveTab,
  type StudentInfo,
} from './AnotacionesStudentDetailModal/constants';
import StudentSummaryTab from './AnotacionesStudentDetailModal/StudentSummaryTab';
import RevisionTab from './AnotacionesStudentDetailModal/RevisionTab';
import HistoryTab from './AnotacionesStudentDetailModal/HistoryTab';
import CartasTab from './AnotacionesStudentDetailModal/CartasTab';
import EditAnnotationsTab from './AnotacionesStudentDetailModal/EditAnnotationsTab';
import { useDisciplinaryData } from './AnotacionesStudentDetailModal/hooks/useDisciplinaryData';
import { Dialog, DialogDescription, DialogTitle } from '@/src/shared/ui/Dialog';
import {
  DetailModalBody,
  DetailModalContent,
  DetailModalHeader,
  DetailModalTabs,
  type DetailModalTab,
} from '@/src/shared/ui/DetailModal';

const Skeleton = memo(function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-neutral-200 ${className}`} />;
});

interface AnotacionesStudentDetailModalProps {
  student: StudentInfo;
  annotations: Annotation[];
  privacyMode: boolean;
  initialTab?: ActiveTab;
  onClose: () => void;
  onDataChanged?: () => void | Promise<void>;
  teachers?: Record<string, string>;
}

export default function AnotacionesStudentDetailModal({
  student,
  annotations,
  privacyMode,
  initialTab = 'estado',
  onClose,
  onDataChanged,
  teachers,
}: AnotacionesStudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [pendingCartaSuggestion, setPendingCartaSuggestion] = useState<{
    docType: LetterDocType;
    negativeCount: number;
    source: 'pdf' | 'supabase';
  } | null>(null);
  const disciplinaryData = useDisciplinaryData(student.id);

  const fallbackCounts = useMemo(() => {
    const schoolYear = getCurrentSchoolYear();
    if (annotations.length === 0) {
      return {
        negativas: Number(student.annotations_count) || 0,
        positivas: Number(student.positive_annotations_count) || 0,
        informativas: 0,
      };
    }
    return annotations.reduce(
      (acc, annotation) => {
        if (getYearInChile(annotation.date) !== schoolYear) return acc;
        if (annotation.type === 'Negativa') acc.negativas += 1;
        if (annotation.type === 'Positiva') acc.positivas += 1;
        if (annotation.type === 'Información') acc.informativas += 1;
        return acc;
      },
      { negativas: 0, positivas: 0, informativas: 0 },
    );
  }, [annotations, student.annotations_count, student.positive_annotations_count]);

  const counts = disciplinaryData.annotations.length > 0 ? disciplinaryData.counts : fallbackCounts;
  const effectiveAnnotations =
    disciplinaryData.annotations.length > 0 ? disciplinaryData.annotations : annotations;
  const stage = getDisciplinaryStage(counts.negativas);
  const stageStyle = STAGE_STYLE[stage.key];

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, student.id]);

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
            onConfirmed={async () => {
              await Promise.all([disciplinaryData.refresh(), onDataChanged?.()]);
            }}
            onGoToCarta={(docType, negativeCount) => {
              setPendingCartaSuggestion({ docType, negativeCount, source: 'pdf' });
              setActiveTab('cartas');
            }}
          />
        );
      case 'editar_anotaciones':
        return (
          <EditAnnotationsTab
            annotations={effectiveAnnotations}
            onSaved={async () => {
              await Promise.all([disciplinaryData.refresh(), onDataChanged?.()]);
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
            pendingSuggestion={pendingCartaSuggestion}
            privacyMode={privacyMode}
            teachers={teachers}
            onRefresh={async () => {
              await Promise.all([disciplinaryData.refresh(), onDataChanged?.()]);
            }}
          />
        );
      case 'historial':
        return (
          <HistoryTab
            studentId={student.id}
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DetailModalContent
        ariaLabel={`Ficha disciplinaria de ${maskName(student.full_name, privacyMode)}`}
      >
        <DialogTitle className="sr-only">
          Ficha disciplinaria de {maskName(student.full_name, privacyMode)}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Revisión del estado, anotaciones, cartas e historial disciplinario del estudiante.
        </DialogDescription>
        <DetailModalHeader
          avatarInitial={student.full_name.charAt(0).toUpperCase()}
          title={privacyMode ? maskName(student.full_name, privacyMode) : student.full_name}
          metadata={
            <>
              <span>{student.course_name || student.course_id || 'Sin curso'}</span>
              {student.rut && <span>{maskRut(student.rut, privacyMode)}</span>}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${stageStyle.bg} ${stageStyle.text}`}
              >
                {stage.label}
              </span>
              <span>{counts.negativas} negativas</span>
            </>
          }
          actions={
            <>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          }
        />
        <DetailModalTabs
          activeTab={activeTab}
          ariaLabel="Secciones de la ficha disciplinaria"
          onChange={setActiveTab}
          tabs={(Object.keys(TAB_ICONS) as ActiveTab[]).map((tab): DetailModalTab<ActiveTab> => ({
            id: tab,
            label: TAB_LABELS[tab],
            icon: TAB_ICONS[tab],
          }))}
        />
        <DetailModalBody>{renderTabContent()}</DetailModalBody>
      </DetailModalContent>
    </Dialog>
  );
}
