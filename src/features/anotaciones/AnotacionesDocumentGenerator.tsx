/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Annotation } from '@/src/types';
import { getCurrentDateStr, getSemaphoricStyle } from '@/src/lib/anotacionesUtils';
import DocTypeSelector from './docgen/DocTypeSelector';
import DocumentForm from './docgen/DocumentForm';
import DocumentPreview from './docgen/DocumentPreview';
import DocumentWarnings from './docgen/DocumentWarnings';
import { useDocumentState } from './docgen/hooks/useDocumentState';
import { useSelectedAnnotations } from './docgen/hooks/useSelectedAnnotations';
import { useDocumentExport } from './docgen/hooks/useDocumentExport';
import { useDocumentRegistry } from './docgen/hooks/useDocumentRegistry';
import { useRegisterCommitment } from './docgen/hooks/useRegisterCommitment';
import GeneratorHeader from './docgen/components/GeneratorHeader';
import ExportError from './docgen/components/ExportError';
import EmissionConfirmDialog from './docgen/components/EmissionConfirmDialog';
import RecentlyEmitted from './docgen/components/RecentlyEmitted';
import { TITLE_MAP, type DocType, type LetterContent } from './docgen/DocumentPreview/docTypes';

function getDocumentStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((styleNode) => styleNode.outerHTML)
    .join('\n');
}

function isLetterContent(value: unknown): value is LetterContent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<keyof LetterContent, unknown>;
  return ['motivo', 'descripcion', 'medida', 'acuerdos', 'cierre', 'observaciones'].every(
    (field) => typeof candidate[field as keyof LetterContent] === 'string'
  );
}

function getSnapshotString(snapshot: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = snapshot?.[key];
  return typeof value === 'string' ? value : null;
}

function openPrintWindow(html: string, title: string): boolean {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>${getDocumentStyles()}<style>html,body{margin:0;background:#fff}body{display:flex;justify-content:center;color:#111827}#document-preview-a4{box-sizing:border-box;width:210mm;min-height:297mm}@page{size:A4;margin:0}@media print{html,body{width:210mm;min-height:297mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}#document-preview-a4{max-width:none!important;box-shadow:none!important;border:0!important;border-radius:0!important}}</style></head><body>${html}</body></html>`;
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    return false;
  }
  const timer = window.setInterval(() => {
    try {
      if (win.document.readyState === 'complete') {
        window.clearInterval(timer);
        win.print();
        URL.revokeObjectURL(url);
      }
    } catch {
      window.clearInterval(timer);
      URL.revokeObjectURL(url);
    }
  }, 100);
  window.setTimeout(() => {
    window.clearInterval(timer);
    URL.revokeObjectURL(url);
  }, 10000);
  return true;
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
  onLetterAction?: (action: 'printed' | 'downloaded_pdf' | 'downloaded_word') => void | Promise<void>;
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
  const documentExport = useDocumentExport();
  const documentRegistry = useDocumentRegistry();
  const registerCommitment = useRegisterCommitment();
  const previewRef = useRef<HTMLDivElement>(null);
  const { docType, setDocType } = documentState;

  useEffect(() => {
    if (!initialContentSnapshot || initialSnapshotApplied.current) return;
    const snapshotDocType = getSnapshotString(initialContentSnapshot, 'docType');
    if (snapshotDocType === 'amonestacion' || snapshotDocType === 'compromiso_conductual' || snapshotDocType === 'derivacion') {
      setDocType(snapshotDocType);
      initialDocTypeApplied.current = true;
    }
    if (isLetterContent(initialContentSnapshot.letterContent)) {
      documentState.setLetterContent(initialContentSnapshot.letterContent);
    }
    documentState.setApoderadoName(getSnapshotString(initialContentSnapshot, 'apoderadoName') || '');
    documentState.setInspectorName(getSnapshotString(initialContentSnapshot, 'inspectorName') || '');
    documentState.setCoordinatorName(getSnapshotString(initialContentSnapshot, 'coordinatorName') || '');
    documentState.setEmittedBy(getSnapshotString(initialContentSnapshot, 'emittedBy') || '');
    documentState.setDocObservations(getSnapshotString(initialContentSnapshot, 'administrativeObservation') || '');
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

  const selectedAnnsObjects = selectedAnnotations.selectedAnnsObjects;
  const dateStr = getCurrentDateStr();
  const title = TITLE_MAP[docType];

  const contentSnapshot = useMemo(() => ({
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
    emittedBy: documentState.emittedBy || 'Inspectoría',
    emissionDate: dateStr,
    sourceAnalysisId: sourceAnalysisId || null,
    sourceProcessId: sourceProcessId || null,
    administrativeObservation: documentState.docObservations || null,
  }), [
    dateStr,
    docType,
    documentState.apoderadoName,
    documentState.coordinatorName,
    documentState.docObservations,
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
  ]);

  const previewContent = useMemo(() => ({
    title,
    content: [
      documentState.letterContent.motivo,
      documentState.letterContent.descripcion,
      documentState.letterContent.medida,
      documentState.letterContent.acuerdos,
      documentState.letterContent.cierre,
      documentState.letterContent.observaciones,
    ].filter(Boolean).join('\n\n'),
    metadata: {
      Estudiante: student.full_name,
      Curso: student.course_id,
      RUN: student.rut || '-',
      'Anotaciones negativas': String(negativeCount),
      'Tipo de documento': title,
      'Fecha de emisión': dateStr,
    },
    letterContent: documentState.letterContent,
  }), [dateStr, documentState.letterContent, negativeCount, student.course_id, student.full_name, student.rut, title]);

  const handleRegisterCommitment = registerCommitment.handleRegisterCommitment;

  const registerCarta = (afterSuccess?: () => void) => {
    handleRegisterCommitment({
      student,
      docType,
      negativeCount,
      apoderadoName: documentState.apoderadoName,
      coordinatorName: documentState.coordinatorName,
      emittedBy: documentState.emittedBy,
      docObservations: documentState.docObservations,
      compromisoStatus: 'Vigente',
      teachers,
      existingCartaId,
      contentSnapshot,
      onSuccess: (entry) => {
        documentRegistry.addEntry(entry);
        setRegistrationMessage('Carta registrada correctamente. La plantilla permanece disponible para imprimir o descargar.');
        void (async () => {
          try {
            await onRegistered?.();
          } catch {
            setRegistrationError('La carta se registró, pero no se pudo actualizar el estado de la ficha.');
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

  const getPreviewHtml = () => previewRef.current?.outerHTML || '';

  const handlePrintDoc = () => {
    setExportError(null);
    const html = getPreviewHtml();
    if (!html) {
      setExportError('No se pudo leer la plantilla visible para imprimir.');
      return;
    }
    if (!openPrintWindow(html, 'Imprimir carta disciplinaria')) {
      setExportError('El navegador bloqueó la ventana de impresión. Permita ventanas emergentes.');
      return;
    }
    void onLetterAction?.('printed');
    setShowEmissionConfirm(true);
  };

  const handleExportPDF = () => {
    setExportError(null);
    const html = getPreviewHtml();
    if (!html) {
      setExportError('No se pudo leer la plantilla visible para generar PDF.');
      return;
    }
    if (!openPrintWindow(html, 'Guardar carta como PDF')) {
      setExportError('El navegador bloqueó la ventana. Permita ventanas emergentes y use Guardar como PDF.');
      return;
    }
    void onLetterAction?.('downloaded_pdf');
    setShowEmissionConfirm(true);
  };

  const handleExportWord = async () => {
    setExportError(null);
    try {
      const blob = await documentExport.generateWord(previewContent);
      documentExport.downloadBlob(blob, `Carta_${docType}_${student.full_name.replace(/\s+/g, '_')}.docx`);
      void onLetterAction?.('downloaded_word');
      setShowEmissionConfirm(true);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'No se pudo generar el documento Word.');
    }
  };

  return (
    <div className="space-y-6">
      <ExportError message={exportError} onClose={() => setExportError(null)} />

      {registrationMessage && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {registrationMessage}
        </div>
      )}
      {registrationError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {registrationError}
        </div>
      )}


      <EmissionConfirmDialog isOpen={showEmissionConfirm} onConfirm={handleEmitAfterExport} onCancel={() => setShowEmissionConfirm(false)} />

      <div className="mx-auto w-full max-w-[210mm] space-y-5">
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
            docObservations={documentState.docObservations}
            onObservationsChange={documentState.setDocObservations}
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
        docObservations={documentState.docObservations}
        selectedAnnsObjects={selectedAnnsObjects}
        hasTenOrMore={negativeCount >= 10}
        letterContent={documentState.letterContent}
        onPrint={handlePrintDoc}
        onExportPDF={handleExportPDF}
        onExportWord={handleExportWord}
      />

      <div className="mx-auto w-full max-w-[210mm]">
        <RecentlyEmitted emittedList={documentRegistry.emittedList} />
      </div>
    </div>
  );
}
