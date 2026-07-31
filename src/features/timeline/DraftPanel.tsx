/** @license SPDX-License-Identifier: Apache-2.0 */

import type React from 'react';
import { forwardRef, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Eye, FileText, RefreshCw, FileSignature, Printer, PencilLine } from 'lucide-react';
import { LOGO_URL } from '@/src/lib/logoBase64';
import { LetterInstitutionalHeader } from '@/src/features/anotaciones/docgen/DocumentPreview/SharedComponents';
import Button from '@/src/shared/ui/Button';
import './official-document.css';

type DocType =
  | 'notificacion_apertura'
  | 'citacion_entrevista'
  | 'informe_cierre_indagacion'
  | 'informe_concluyente';

type MarkdownRenderer = ({ text }: { text: string }) => React.ReactElement;

const DOCUMENT_TITLES: Record<DocType, string> = {
  notificacion_apertura: 'Notificación de Apertura de Indagación de Convivencia Escolar',
  citacion_entrevista:
    'Citación para Entrega de la Notificación de Apertura de Indagación de Convivencia Escolar',
  informe_cierre_indagacion: 'Informe de Cierre de Indagación',
  informe_concluyente: 'Informe Concluyente y Resolución',
};

interface DraftPanelProps {
  selectedDocType: DocType;
  setSelectedDocType: React.Dispatch<React.SetStateAction<DocType>>;
  fatherName: string;
  setFatherName: React.Dispatch<React.SetStateAction<string>>;
  draftedDocument: string;
  setDraftedDocument: React.Dispatch<React.SetStateAction<string>>;
  draftError: string | null;
  isDrafting: boolean;
  handleDraftDocument: () => Promise<void>;
  studentName: string;
  course: string;
  caseId: string;
  CustomMarkdownRenderer: MarkdownRenderer;
}

export default function DraftPanel({
  selectedDocType,
  setSelectedDocType,
  fatherName,
  setFatherName,
  draftedDocument,
  setDraftedDocument,
  draftError,
  isDrafting,
  handleDraftDocument,
  studentName,
  course,
  caseId,
  CustomMarkdownRenderer,
}: DraftPanelProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const documentTitle = DOCUMENT_TITLES[selectedDocType];
  const requiresResponsible =
    selectedDocType === 'notificacion_apertura' || selectedDocType === 'citacion_entrevista';
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'America/Santiago' }).format(
        new Date(),
      ),
    [],
  );
  const printDocument = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${caseId}_${documentTitle}`.replace(/[^a-zA-Z0-9_ -]/g, ''),
    pageStyle: `@page { size: 216mm 330mm; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-brand-200 bg-brand-50 p-3 text-left">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-[11px] text-neutral-900">
            Redacción de documentos oficiales
          </h4>
          <p className="mt-0.5 text-[10px] leading-relaxed text-neutral-500">
            Gemini prepara un borrador desde los antecedentes registrados. Revise y edite el
            documento antes de imprimirlo.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="doc-type"
          className="block font-semibold text-[10px] uppercase tracking-wider text-neutral-500"
        >
          Tipo de documento
        </label>
        <select
          id="doc-type"
          value={selectedDocType}
          onChange={(event) => setSelectedDocType(event.target.value as DocType)}
          className="w-full rounded-lg border border-neutral-300 bg-white p-2.5 font-medium text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="notificacion_apertura">Notificación de Apertura de Indagación</option>
          <option value="citacion_entrevista">Citación para entrega de notificación</option>
          <option value="informe_cierre_indagacion">Informe de Cierre de Indagación</option>
          <option value="informe_concluyente">Informe Concluyente y Resolución</option>
        </select>
      </div>

      {requiresResponsible && (
        <div>
          <label
            htmlFor="father-name"
            className="block font-semibold text-[10px] uppercase tracking-wider text-neutral-500"
          >
            Nombre del apoderado/a o adulto responsable
          </label>
          <input
            id="father-name"
            aria-label="Nombre del apoderado o adulto responsable"
            type="text"
            spellCheck={false}
            value={fatherName}
            onChange={(event) => setFatherName(event.target.value)}
            placeholder="Ej. Juan Pérez González"
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white p-2.5 font-medium text-xs text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
      )}

      <Button
        type="button"
        onClick={handleDraftDocument}
        disabled={isDrafting}
        fullWidth
        className="rounded-lg px-4 py-2.5 text-xs"
      >
        {isDrafting ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> Redactando
            documento...
          </>
        ) : (
          <>
            <FileSignature className="h-4 w-4" aria-hidden="true" /> Generar borrador legal
          </>
        )}
      </Button>

      {draftError && (
        <p
          role="alert"
          className="rounded-lg border border-gravisima-200 bg-gravisima-50 px-3 py-2 text-xs text-gravisima-700"
        >
          {draftError}
        </p>
      )}

      {draftedDocument && (
        <section className="space-y-3" aria-label="Edición e impresión del borrador">
          <div className="flex items-center gap-2">
            <PencilLine className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h5 className="font-semibold text-sm text-neutral-900">
              Editar borrador antes de imprimir
            </h5>
          </div>
          <textarea
            value={draftedDocument}
            onChange={(event) => setDraftedDocument(event.target.value)}
            aria-label="Contenido editable del borrador"
            className="min-h-72 w-full resize-y rounded-xl border border-neutral-300 bg-white p-3 font-mono text-xs leading-relaxed text-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            spellCheck={false}
          />

          <details className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 font-semibold text-[11px] text-slate-700 marker:hidden">
              <Eye className="size-4 text-brand-600" aria-hidden="true" />
              Ver vista previa para impresión Oficio
            </summary>
            <div className="overflow-x-auto border-slate-200 border-t p-3">
              <div className="origin-top-left scale-[0.42]" style={{ width: '238%' }}>
                <OfficialDraftDocument
                  title={documentTitle}
                  studentName={studentName}
                  course={course}
                  caseId={caseId}
                  date={date}
                  text={draftedDocument}
                  CustomMarkdownRenderer={CustomMarkdownRenderer}
                />
              </div>
            </div>
          </details>

          <OfficialDraftDocument
            ref={printRef}
            title={documentTitle}
            studentName={studentName}
            course={course}
            caseId={caseId}
            date={date}
            text={draftedDocument}
            CustomMarkdownRenderer={CustomMarkdownRenderer}
            printSource
          />
          <button
            type="button"
            onClick={() => printDocument()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 font-semibold text-xs text-white transition-colors hover:bg-slate-900"
          >
            <Printer className="h-4 w-4" aria-hidden="true" /> Imprimir en formato Oficio
          </button>
        </section>
      )}
    </div>
  );
}

interface OfficialDraftDocumentProps {
  title: string;
  studentName: string;
  course: string;
  caseId: string;
  date: string;
  text: string;
  CustomMarkdownRenderer: MarkdownRenderer;
  printSource?: boolean;
}

const OfficialDraftDocument = forwardRef<HTMLDivElement, OfficialDraftDocumentProps>(
  function OfficialDraftDocument(
    { title, studentName, course, caseId, date, text, CustomMarkdownRenderer, printSource = false },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={`official-document${printSource ? ' official-document--print-source' : ''}`}
      >
        <LetterInstitutionalHeader year="2026" logoSrc={LOGO_URL} />
        <h1 className="official-document-title">{title}</h1>
        <p className="official-document-meta">
          <strong>Folio:</strong> {caseId} &nbsp;·&nbsp; <strong>Fecha:</strong> {date}
          <br />
          <strong>Estudiante:</strong> {studentName} &nbsp;·&nbsp; <strong>Curso:</strong>{' '}
          {course || 'No registrado'}
        </p>
        <div className="official-document-body">
          <CustomMarkdownRenderer text={text} />
        </div>
      </div>
    );
  },
);
