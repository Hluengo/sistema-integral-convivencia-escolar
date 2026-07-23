/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useState, useRef } from 'react';
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
import RecentlyEmitted from './docgen/components/RecentlyEmitted';

function getDocumentStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((styleNode) => styleNode.outerHTML)
    .join('\n');
}

function openPrintWindow(html: string, title: string): boolean {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>${getDocumentStyles()}<style>html,body{margin:0;background:#fff}body{display:flex;justify-content:center;color:#111827}@page{size:A4;margin:0}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}#document-preview-a4{box-shadow:none!important;border:0!important;border-radius:0!important}}</style></head><body>${html}</body></html>`;
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
  onLetterAction?: (action: 'printed' | 'downloaded_pdf') => void | Promise<void>;
  onRegistered?: () => void | Promise<void>;
}

export default function AnotacionesDocumentGenerator({
  student,
  annotations,
  privacyMode: _privacyMode,
  teachers,
  initialDocType,
  existingCartaId,
  onLetterAction,
  onRegistered,
}: AnotacionesDocumentGeneratorProps) {
  const initialDocTypeApplied = useRef(false);
  const negativeAnnotations = annotations.filter((a) => a.type === 'Negativa');
  const negativeCount = negativeAnnotations.length;
  const semaphoric = getSemaphoricStyle(negativeCount);

  const documentState = useDocumentState();
  const selectedAnnotations = useSelectedAnnotations(annotations);
  const documentRegistry = useDocumentRegistry();
  const registerCommitment = useRegisterCommitment();
  const previewRef = useRef<HTMLDivElement>(null);

  const { docType, setDocType } = documentState;

  useEffect(() => {
    if (initialDocType && !initialDocTypeApplied.current) {
      setDocType(initialDocType as 'amonestacion' | 'compromiso_conductual' | 'derivacion');
      initialDocTypeApplied.current = true;
    }
  }, [initialDocType, setDocType]);

  const hasInitialDocType = initialDocType !== undefined;

  useEffect(() => {
    if (hasInitialDocType) return;
    if (negativeCount >= 10 && docType !== 'compromiso_conductual') {
      setDocType('compromiso_conductual');
    } else if (negativeCount < 10 && docType === 'compromiso_conductual') {
      setDocType('amonestacion');
    }
  }, [negativeCount, docType, setDocType, hasInitialDocType]);

  useEffect(() => {
    selectedAnnotations.selectAllNegative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [exportError, setExportError] = useState<string | null>(null);
  const [showEmissionConfirm, setShowEmissionConfirm] = useState(false);

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
      onSuccess: (entry) => {
        documentRegistry.addEntry(entry);
        void onRegistered?.();
        afterSuccess?.();
      },
      setIsRegistering: documentState.setIsRegistering,
    });
  };

  const handleEmitAfterExport = () => {
    registerCarta();
    setShowEmissionConfirm(false);
  };

  const handleRegisterCommitmentWrapper = () => {
    registerCarta(() => handleExportPDF());
  };

  const selectedAnnsObjects = selectedAnnotations.selectedAnnsObjects;

  const getPreviewHtml = () => {
    const el = previewRef.current;
    if (!el) return '';
    return el.outerHTML;
  };

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

  return (
    <div className="space-y-6">
      <ExportError message={exportError} onClose={() => setExportError(null)} />

      <EmissionConfirmDialog
        isOpen={showEmissionConfirm}
        onConfirm={handleEmitAfterExport}
        onCancel={() => setShowEmissionConfirm(false)}
      />

      <div className="mx-auto w-full max-w-[210mm] space-y-5">
        <GeneratorHeader negativeCount={negativeCount} semaphoric={semaphoric} />

        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <DocTypeSelector
            docType={docType}
            onDocTypeChange={(type: string) => setDocType(type as 'amonestacion' | 'compromiso_conductual' | 'derivacion')}
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
        dateStr={getCurrentDateStr()}
        negativeCount={negativeCount}
        docObservations={documentState.docObservations}
        selectedAnnsObjects={selectedAnnsObjects}
        hasTenOrMore={negativeCount >= 10}
        onPrint={handlePrintDoc}
        onExportPDF={handleExportPDF}
      />

      <div className="mx-auto w-full max-w-[210mm]">
        <RecentlyEmitted emittedList={documentRegistry.emittedList} />
      </div>
    </div>
  );
}
