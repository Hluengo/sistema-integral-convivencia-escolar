/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useEffect, useState, useRef } from 'react';
import { Printer, FileDown, FileText, AlertTriangle, CheckCircle2, X } from 'lucide-react';
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
}

export default function AnotacionesDocumentGenerator({
  student,
  annotations,
  privacyMode: _privacyMode,
  teachers,
  initialDocType,
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
  const [isExporting, setIsExporting] = useState(false);
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
      onSuccess: (entry) => documentRegistry.addEntry(entry),
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
      compromisoStatus: documentState.compromisoStatus,
      teachers,
      onSuccess: (entry) => documentRegistry.addEntry(entry),
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

  // Export handlers
  const handleExportPDF = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      const blob = await documentExport.generatePDF(previewContent);
      documentExport.downloadBlob(blob, `Carta_de_${docType}_${student.full_name.replace(/\s+/g, '_')}.pdf`);
      setShowEmissionConfirm(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el PDF.';
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = async () => {
    setExportError(null);
    setIsExporting(true);
    try {
      const blob = await documentExport.generateWord(previewContent);
      documentExport.downloadBlob(blob, `Carta_de_${docType}_${student.full_name.replace(/\s+/g, '_')}.docx`);
      setShowEmissionConfirm(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el documento Word.';
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintDoc = () => {
    const titleMap: Record<string, string> = {
      amonestacion: 'Carta de Amonestaci\u00f3n',
      compromiso_conductual: 'Carta de Compromiso Conductual',
      derivacion: 'Ficha de Derivaci\u00f3n',
    };

    const htmlContent = `
      <div style="max-width: 210mm; margin: 0 auto; font-family: Arial, sans-serif;">
        <h2 style="text-align: center;">${previewContent.title}</h2>
        <p><strong>Estudiante:</strong> ${student.full_name}</p>
        <p><strong>Curso:</strong> ${student.course_id}</p>
        <p><strong>RUN:</strong> ${student.rut || 'N/A'}</p>
        <p><strong>Apoderado:</strong> ${documentState.apoderadoName || '________________'}</p>
        <hr />
        <p><strong>Fecha:</strong> ${getCurrentDateStr()}</p>
        <p><strong>Anotaciones consideradas:</strong> ${negativeCount}</p>
        <hr />
        <p>${documentState.docObservations || 'Sin observaciones adicionales.'}</p>
      </div>
    `;

    documentExport.printDocument(htmlContent);
    setShowEmissionConfirm(true);
  };

  // Render
  return (
    <div className="space-y-6">
      {exportError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{exportError}</span>
          <button type="button" onClick={() => setExportError(null)} aria-label="Cerrar mensaje de error" className="shrink-0 text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showEmissionConfirm && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-600" />
            <span>Documento exportado correctamente. ¿Marcar como emitido en el historial?</span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleEmitAfterExport}
              className="rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white text-xs transition-colors hover:bg-amber-700"
            >
              Sí, marcar como emitida
            </button>
            <button
              type="button"
              onClick={() => setShowEmissionConfirm(false)}
              className="rounded-lg bg-white px-3 py-1.5 font-medium text-neutral-600 text-xs transition-colors hover:bg-neutral-100"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <FileText className="h-5 w-5 text-indigo-600" />
            Generaci\u00f3n de Documentos Disciplinarios
          </h3>
          <p className="mt-1 text-neutral-500 text-xs">
            Emisi\u00f3n de cartas de amonestaci\u00f3n, compromiso conductual y derivaci\u00f3n.
          </p>
        </div>
        <div
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 font-semibold text-xs ${semaphoric.badge}`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {negativeCount >= 10
              ? `Reiteraci\u00f3n de faltas (${negativeCount} negativas)`
              : `Estado: ${negativeCount} anotaciones negativas`}
          </span>
        </div>
      </div>

      {/* Main grid: Left form / Right preview */}
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
            docObservations={documentState.docObservations}
            onObservationsChange={documentState.setDocObservations}
            selectedAnnotationsForDoc={Array.from(selectedAnnotations.selectedIds)}
            onToggleAnnotation={selectedAnnotations.toggleAnnotation}
            compromisoStatus={documentState.compromisoStatus}
            onCompromisoStatusChange={documentState.setCompromisoStatus}
            customCommitments={documentState.customCommitments}
            onAddCommitment={documentState.handleAddCustomCommitment}
            onRemoveCommitment={documentState.handleRemoveCustomCommitment}
            negativeCount={negativeCount}
            annotations={annotations}
            onRegisterCommitment={handleRegisterCommitmentWrapper}
            isRegistering={documentState.isRegistering}
          />
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-7">
          {/* Document preview */}
          <DocumentPreview
            docType={docType}
            currentName={student.full_name}
            currentCourse={student.course_id}
            currentRut={student.rut || ''}
            currentTeacher={teachers[student.course_id] || student.teacher_id || 'Sin Profesor'}
            coordinatorName={documentState.coordinatorName}
            apoderadoName={documentState.apoderadoName}
            dateStr={getCurrentDateStr()}
            negativeCount={negativeCount}
            docObservations={documentState.docObservations}
            customCommitments={documentState.customCommitments}
            selectedAnnsObjects={selectedAnnsObjects}
            hasTenOrMore={negativeCount >= 10}
            onPrint={handlePrintDoc}
            onExportPDF={handleExportPDF}
            onExportWord={handleExportWord}
          />

          {/* Action buttons */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
            <p className="mb-3 font-semibold text-neutral-500 text-xs uppercase tracking-wider">
              Acciones del Documento
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePrintDoc}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-neutral-800 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" />
                {isExporting ? 'Exportando...' : 'Descargar PDF'}
              </button>
              <button
                type="button"
                onClick={handleExportWord}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" />
                {isExporting ? 'Exportando...' : 'Descargar Word'}
              </button>
            </div>
          </div>

          {/* Recently emitted */}
          {documentRegistry.emittedList.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
              <h4 className="mb-3 font-semibold text-neutral-500 text-xs uppercase tracking-wider">
                \u00daltimos documentos emitidos
              </h4>
              <ul className="space-y-2">
                {documentRegistry.emittedList.slice(0, 5).map((entry, i) => (
                  <li
                    key={entry.id || i}
                    className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-neutral-700 text-xs"
                  >
                    <span className="truncate font-medium">
                      {entry.studentName || entry.student_name}
                    </span>
                    <span className="ml-2 shrink-0 text-neutral-400">
                      {entry.emissionDate || entry.emission_date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}