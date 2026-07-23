/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useEffect, useState, useRef } from 'react';
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

function openPrintWindow(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) return false;
  const timer = setInterval(() => {
    try {
      if (w.document.readyState === 'complete') {
        clearInterval(timer);
        w.print();
        URL.revokeObjectURL(url);
      }
    } catch { /* cross-origin */ }
  }, 100);
  setTimeout(() => { clearInterval(timer); URL.revokeObjectURL(url); }, 10000);
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
  onRegistered?: () => void | Promise<void>;
}

export default function AnotacionesDocumentGenerator({
  student,
  annotations,
  privacyMode: _privacyMode,
  teachers,
  initialDocType,
  onRegistered,
}: AnotacionesDocumentGeneratorProps) {
  const initialDocTypeApplied = useRef(false);

  // Derived data
  const negativeAnnotations = annotations.filter((a) => a.type === 'Negativa');
  const negativeCount = negativeAnnotations.length;
  const semaphoric = getSemaphoricStyle(negativeCount);
  const dateStr = getCurrentDateStr();

  // Hooks
  const documentState = useDocumentState();
  const selectedAnnotations = useSelectedAnnotations(annotations);
  const documentExport = useDocumentExport();
  const documentRegistry = useDocumentRegistry();
  const registerCommitment = useRegisterCommitment();

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

  const handleEmitAfterExport = () => {
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
      onSuccess: (entry) => {
        documentRegistry.addEntry(entry);
        void onRegistered?.();
      },
      setIsRegistering: documentState.setIsRegistering,
    });
    setShowEmissionConfirm(false);
  };

// Handle registration
  const handleRegisterCommitment = useMemo(
    () => registerCommitment.handleRegisterCommitment,
    [registerCommitment.handleRegisterCommitment]
  );

  const handleRegisterCommitmentWrapper = () => {
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
      onSuccess: (entry) => {
        documentRegistry.addEntry(entry);
        void onRegistered?.();
        handleExportPDF();
      },
      setIsRegistering: documentState.setIsRegistering,
    });
  };

  // Selected annotations for preview
  const selectedAnnsObjects = selectedAnnotations.selectedAnnsObjects;

  // Preview content for export/print
  const previewContent = useMemo(() => {
    const titleMap: Record<string, string> = {
      amonestacion: 'Carta de Amonestaci\u00f3n',
      compromiso_conductual: 'Carta de Compromiso Conductual',
      derivacion: 'Ficha de Derivaci\u00f3n',
    };

    return {
      title: titleMap[docType] || 'Documento Disciplinario',
      content: `
        Estudiante: ${student.full_name}
        Curso: ${student.course_id}
        RUN: ${student.rut || 'N/A'}
        Apoderado: ${documentState.apoderadoName || '________________'}
        Coordinador: ${documentState.coordinatorName || '________________'}
        Emitido por: ${documentState.emittedBy || 'Inspector\u00eda'}
        Fecha: ${dateStr}
        Anotaciones negativas: ${negativeCount}
        
        Observaciones:
        ${documentState.docObservations || 'Sin observaciones adicionales.'}
        
        Compromisos personalizados:
        ${documentState.customCommitments.length > 0
          ? documentState.customCommitments.map((c, i) => `${i + 1}. ${c}`).join('\n')
          : 'Ninguno'}
      `,
      metadata: {
        'Tipo de documento': docType === 'amonestacion' ? 'Amonestación' : docType === 'compromiso_conductual' ? 'Compromiso Conductual' : 'Derivación',
        'Estado': documentState.compromisoStatus,
        'Reiteración': negativeCount >= 10 ? 'Sí (≥10 anotaciones negativas)' : 'No',
      },
    };
  }, [docType, student, dateStr, negativeCount, documentState]);

  // Ref to the A4 preview container for PDF/Print export
  const previewRef = useRef<HTMLDivElement>(null);

  const getPreviewHtml = () => {
    const el = previewRef.current;
    if (!el) return '';
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('\n');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Documento</title>${styles}<style>body{margin:0;display:flex;justify-content:center;background:#fff}@page{size:A4;margin:0}</style></head><body>${el.outerHTML}</body></html>`;
  };

  // Export handlers
  const handleExportPDF = () => {
    const html = getPreviewHtml();
    if (!html) { setExportError('No se pudo generar el PDF. Intente de nuevo.'); return; }
    if (!openPrintWindow(html)) { setExportError('El navegador bloqueó la ventana. Permita ventanas emergentes.'); return; }
    setShowEmissionConfirm(true);
  };

  const handlePrintDoc = () => {
    const html = getPreviewHtml();
    if (!html) return;
    if (!openPrintWindow(html)) return;
    setShowEmissionConfirm(true);
  };

  const handleExportWord = async () => {
    setExportError(null);
    try {
      const blob = await documentExport.generateWord(previewContent);
      documentExport.downloadBlob(blob, `Carta_de_${docType}_${student.full_name.replace(/\s+/g, '_')}.docx`);
      setShowEmissionConfirm(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el documento Word.';
      setExportError(msg);
    }
  };

  // Render
  return (
    <div className="space-y-6">
      <ExportError message={exportError} onClose={() => setExportError(null)} />

      <EmissionConfirmDialog
        isOpen={showEmissionConfirm}
        onConfirm={handleEmitAfterExport}
        onCancel={() => setShowEmissionConfirm(false)}
      />

      <GeneratorHeader negativeCount={negativeCount} semaphoric={semaphoric} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-5">
          {/* Document type selector */}
          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
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

          {/* Document form */}
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

        {/* Right column */}
        <div className="space-y-4 lg:col-span-7">
          {/* Document preview - already includes action buttons */}
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
            onExportWord={handleExportWord}
          />

          <RecentlyEmitted emittedList={documentRegistry.emittedList} />
        </div>
      </div>
    </div>
  );
}
