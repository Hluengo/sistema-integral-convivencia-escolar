/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import type { Annotation } from '@/src/types';
import { getCurrentDateStr, getSemaphoricStyle } from '@/src/lib/anotacionesUtils';
import DocTypeSelector from './docgen/DocTypeSelector';
import DocumentForm from './docgen/DocumentForm';
import DocumentPreview from './docgen/DocumentPreview';
import DocumentWarnings from './docgen/DocumentWarnings';
import { useDocumentState } from './docgen/hooks/useDocumentState';
import { useSelectedAnnotations } from './docgen/hooks/useSelectedAnnotations';
import { useDocumentRegistry } from './docgen/hooks/useDocumentRegistry';
import { useRegisterCommitment } from './docgen/hooks/useRegisterCommitment';
import GeneratorHeader from './docgen/components/GeneratorHeader';
import ExportError from './docgen/components/ExportError';
import EmissionConfirmDialog from './docgen/components/EmissionConfirmDialog';
import PrintHintDialog from './docgen/components/PrintHintDialog';
import RecentlyEmitted from './docgen/components/RecentlyEmitted';
import { TITLE_MAP, type DocType, type LetterContent } from './docgen/DocumentPreview/docTypes';

function isLetterContent(value: unknown): value is LetterContent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<keyof LetterContent, unknown>;
  return ['motivo', 'descripcion', 'medida', 'acuerdos', 'cierre', 'observaciones'].every(
    (field) => typeof candidate[field as keyof LetterContent] === 'string'
  );
}

function getSnapshotString(
  snapshot: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const value = snapshot?.[key];
  return typeof value === 'string' ? value : null;
}

interface AnotacionesDocumentGeneratorProps {
  student: {
    id: string;
    full_name: string;
    course_id: string;
    rut?: string;
    teacher_id?: string;
  };
  annotations: Annotation[];
  privacyMode: boolean;
  teachers: Record<string, string>;
  initialDocType?: string;
  existingCartaId?: string;
  negativeCount?: number;
  sourceAnalysisId?: string | null;
  sourceProcessId?: string | null;
  initialContentSnapshot?: Record<string, unknown> | null;
  onLetterAction?: () => void | Promise<void>;
  onRegistered?: () => void | Promise<void>;
}

export default function AnotacionesDocumentGenerator({
  student,
  annotations,
  privacyMode: _privacyMode,
  teachers,
  initialDocType,
  existingCartaId,
  negativeCount: providedNegativeCount,
  sourceAnalysisId,
  sourceProcessId,
  initialContentSnapshot,
  onLetterAction,
  onRegistered,
}: AnotacionesDocumentGeneratorProps) {
  const initialDocTypeApplied = useRef(false);
  const initialSnapshotApplied = useRef(false);
  const negativeAnnotations = annotations.filter((a) => a.type === 'Negativa');
  const negativeCount = providedNegativeCount ?? negativeAnnotations.length;
  const semaphoric = getSemaphoricStyle(negativeCount);

  const documentState = useDocumentState();
  const selectedAnnotations = useSelectedAnnotations(annotations);
  const documentRegistry = useDocumentRegistry();
  const registerCommitment = useRegisterCommitment();
  const previewRef = useRef<HTMLDivElement>(null);
  const { docType, setDocType } = documentState;

  useEffect(() => {
    if (!initialContentSnapshot || initialSnapshotApplied.current) return;
    const snapshotDocType = getSnapshotString(initialContentSnapshot, 'docType');
    if (
      snapshotDocType === 'amonestacion' ||
      snapshotDocType === 'compromiso_conductual' ||
      snapshotDocType === 'derivacion'
    ) {
      setDocType(snapshotDocType);
      initialDocTypeApplied.current = true;
    }
    if (isLetterContent(initialContentSnapshot.letterContent)) {
      documentState.setLetterContent(initialContentSnapshot.letterContent);
    }
    documentState.setApoderadoName(
      getSnapshotString(initialContentSnapshot, 'apoderadoName') || ''
    );
    documentState.setInspectorName(
      getSnapshotString(initialContentSnapshot, 'inspectorName') || ''
    );
    documentState.setCoordinatorName(
      getSnapshotString(initialContentSnapshot, 'coordinatorName') || ''
    );
    documentState.setEmittedBy(getSnapshotString(initialContentSnapshot, 'emittedBy') || '');
    initialSnapshotApplied.current = true;
  }, [documentState, initialContentSnapshot, setDocType]);

  useEffect(() => {
    if (initialDocType && !initialDocTypeApplied.current) {
      const nextDocType = initialDocType as DocType;
      setDocType(nextDocType);
      documentState.loadDefaultLetterContent(nextDocType);
      initialDocTypeApplied.current = true;
    }
  }, [documentState, initialDocType, setDocType]);

  const hasInitialDocType = initialDocType !== undefined;

  useEffect(() => {
    if (hasInitialDocType) return;
    if (negativeCount >= 10 && docType !== 'compromiso_conductual') {
      setDocType('compromiso_conductual');
      documentState.loadDefaultLetterContent('compromiso_conductual');
    } else if (negativeCount < 10 && docType === 'compromiso_conductual') {
      setDocType('amonestacion');
      documentState.loadDefaultLetterContent('amonestacion');
    }
  }, [documentState, negativeCount, docType, setDocType, hasInitialDocType]);

  useEffect(() => {
    selectedAnnotations.selectAllNegative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [exportError, setExportError] = useState<string | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [showEmissionConfirm, setShowEmissionConfirm] = useState(false);
  const [showPrintHint, setShowPrintHint] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const selectedAnnsObjects = selectedAnnotations.selectedAnnsObjects;
  const dateStr = getCurrentDateStr();
  const title = TITLE_MAP[docType];

  const contentSnapshot = useMemo(
    () => ({
      templateVersion: 'disciplinary-letter-v2',
      docType,
      title,
      negativeCount,
      letterContent: documentState.letterContent,
      student: {
        id: student.id,
        fullName: student.full_name,
        course: student.course_id,
        rut: student.rut || null,
      },
      apoderadoName: documentState.apoderadoName,
      inspectorName: documentState.inspectorName,
      coordinatorName: documentState.coordinatorName,
      emittedBy: documentState.emittedBy || 'Inspectoria',
      emissionDate: dateStr,
      sourceAnalysisId: sourceAnalysisId || null,
      sourceProcessId: sourceProcessId || null,
    }),
    [
      dateStr,
      docType,
      documentState.apoderadoName,
      documentState.coordinatorName,
      documentState.emittedBy,
      documentState.inspectorName,
      documentState.letterContent,
      negativeCount,
      sourceAnalysisId,
      sourceProcessId,
      student.course_id,
      student.full_name,
      student.id,
      student.rut,
      title,
    ]
  );

  const handleRegisterCommitment = registerCommitment.handleRegisterCommitment;

  const registerCarta = (afterSuccess?: () => void) => {
    handleRegisterCommitment({
      student,
      docType,
      negativeCount,
      apoderadoName: documentState.apoderadoName,
      coordinatorName: documentState.coordinatorName,
      emittedBy: documentState.emittedBy,
      compromisoStatus: 'Vigente',
      teachers,
      existingCartaId,
      contentSnapshot,
      onSuccess: (entry) => {
        documentRegistry.addEntry(entry);
        setRegistrationMessage(
          'Carta registrada correctamente. La plantilla permanece disponible para imprimir.'
        );
        void (async () => {
          try {
            await onRegistered?.();
          } catch {
            setRegistrationError(
              'La carta se registro, pero no se pudo actualizar el estado de la ficha.'
            );
          }
        })();
        afterSuccess?.();
      },
      onError: setRegistrationError,
      setIsRegistering: documentState.setIsRegistering,
    });
  };

  const handleEmitAfterExport = () => {
    registerCarta();
    setShowEmissionConfirm(false);
  };

  const handleRegisterCommitmentWrapper = () => {
    registerCarta();
  };

  const printFileName = useMemo(
    () => `Carta_${docType}_${student.full_name.replace(/\s+/g, '_')}_${dateStr}`,
    [docType, student.full_name, dateStr]
  );

  const handleAfterPrint = useCallback(() => {
    void onLetterAction?.();
    setShowEmissionConfirm(true);
  }, [onLetterAction]);

  const handlePrintError = useCallback((_location: 'onBeforePrint' | 'print', error: Error) => {
    setExportError(`Error al imprimir: ${error.message}`);
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: printFileName,
    ignoreGlobalStyles: false,
    pageStyle: `
      @page {
        size: 216mm 279mm;
        margin: 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        width: 216mm;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .letter-document {
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        transform: none !important;
      }
    `,
    onAfterPrint: handleAfterPrint,
    onPrintError: handlePrintError,
  });

  const handlePrintDoc = () => {
    setExportError(null);
    setShowPrintHint(true);
  };

  const handlePrintHintConfirm = () => {
    setShowPrintHint(false);
    setTimeout(() => handlePrint(), 100);
  };

  const handleOverflowChange = (overflow: boolean) => {
    setHasOverflow(overflow);
  };

  return (
    <div className="space-y-6">
      <ExportError message={exportError} onClose={() => setExportError(null)} />

      {registrationMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {registrationMessage}
        </div>
      )}
      {registrationError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {registrationError}
        </div>
      )}

      {hasOverflow && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          El contenido supera una pagina Carta (216 x 279 mm). Reduzca el texto o utilice una
          version de varias paginas antes de imprimir.
        </div>
      )}

      <EmissionConfirmDialog
        isOpen={showEmissionConfirm}
        onConfirm={handleEmitAfterExport}
        onCancel={() => setShowEmissionConfirm(false)}
      />

      <PrintHintDialog
        isOpen={showPrintHint}
        onConfirm={handlePrintHintConfirm}
        onCancel={() => setShowPrintHint(false)}
      />

      <div className="mx-auto w-full max-w-[216mm] space-y-5">
        <GeneratorHeader negativeCount={negativeCount} semaphoric={semaphoric} />

        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <DocTypeSelector
            docType={docType}
            onDocTypeChange={(type: string) => {
              const nextDocType = type as DocType;
              setDocType(nextDocType);
              documentState.loadDefaultLetterContent(nextDocType);
            }}
            hasTenOrMore={negativeCount >= 10}
            negativeCount={negativeCount}
          />

          <DocumentWarnings
            docType={docType}
            negativeCount={negativeCount}
            hasTenOrMore={negativeCount >= 10}
            authorizedBypass={documentState.authorizedBypass}
            onAuthorizedBypass={() => documentState.setAuthorizedBypass((v) => !v)}
            authorizedDuplicate={documentState.authorizedDuplicate}
            onAuthorizedDuplicate={() => documentState.setAuthorizedDuplicate((v) => !v)}
            isDocLockedByProgress={false}
            existingLetter={null}
            bypassProgressLock={documentState.bypassProgressLock}
            onBypassProgressLock={() => documentState.setBypassProgressLock((v) => !v)}
          />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <h4 className="mb-4 text-sm font-bold text-neutral-900">Datos editables de la carta</h4>
          <DocumentForm
            docType={docType}
            apoderadoName={documentState.apoderadoName}
            onApoderadoNameChange={documentState.setApoderadoName}
            coordinatorName={documentState.coordinatorName}
            onCoordinatorNameChange={documentState.setCoordinatorName}
            emittedBy={documentState.emittedBy}
            onEmittedByChange={documentState.setEmittedBy}
            inspectorName={documentState.inspectorName}
            onInspectorNameChange={documentState.setInspectorName}
            letterContent={documentState.letterContent}
            onLetterContentChange={documentState.updateLetterContent}
            onResetLetterContent={() => documentState.resetLetterContent(docType)}
            selectedAnnotationsForDoc={Array.from(selectedAnnotations.selectedIds)}
            onToggleAnnotation={selectedAnnotations.toggleAnnotation}
            negativeCount={negativeCount}
            annotations={annotations}
            onRegisterCommitment={handleRegisterCommitmentWrapper}
            isRegistering={documentState.isRegistering}
          />
        </div>
      </div>

      <DocumentPreview
        ref={previewRef}
        docType={docType}
        currentName={student.full_name}
        currentCourse={student.course_id}
        currentRut={student.rut || ''}
        currentTeacher={teachers[student.course_id] || student.teacher_id || 'Sin Profesor'}
        coordinatorName={documentState.coordinatorName}
        inspectorName={documentState.inspectorName}
        apoderadoName={documentState.apoderadoName}
        dateStr={dateStr}
        negativeCount={negativeCount}
        selectedAnnsObjects={selectedAnnsObjects}
        letterContent={documentState.letterContent}
        onPrint={handlePrintDoc}
        onOverflowChange={handleOverflowChange}
      />

      <div className="mx-auto w-full max-w-[216mm]">
        <RecentlyEmitted emittedList={documentRegistry.emittedList} />
      </div>
    </div>
  );
}
