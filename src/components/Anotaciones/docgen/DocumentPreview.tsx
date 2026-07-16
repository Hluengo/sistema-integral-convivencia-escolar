/** @license SPDX-License-Identifier: Apache-2.0 */

import { Printer, FileDown, FileText } from 'lucide-react';
import type { Annotation } from '../../../types';
import { LOGO_BASE64 } from '../../../lib/logoBase64';
import { TITLE_MAP, type DocType } from './DocumentPreview/docTypes';
import AmonestacionContent from './DocumentPreview/AmonestacionContent';
import CompromisoContent from './DocumentPreview/CompromisoContent';
import DerivacionContent from './DocumentPreview/DerivacionContent';

interface DocumentPreviewProps {
  docType: DocType;
  currentName: string;
  currentRut: string;
  currentCourse: string;
  currentTeacher: string;
  coordinatorName: string;
  apoderadoName: string;
  dateStr: string;
  negativeCount: number;
  docObservations: string;
  customCommitments: string[];
  selectedAnnsObjects: Annotation[];
  hasTenOrMore: boolean;
  onPrint: () => void;
  onExportPDF: () => void;
  onExportWord: () => void;
}

export default function DocumentPreview({
  docType,
  currentName,
  currentRut,
  currentCourse,
  currentTeacher,
  coordinatorName,
  apoderadoName,
  dateStr,
  negativeCount,
  docObservations,
  customCommitments,
  selectedAnnsObjects,
  onPrint,
  onExportPDF,
  onExportWord,
}: DocumentPreviewProps) {
  const title = TITLE_MAP[docType] ?? 'Documento Disciplinario';

  const sharedProps = { currentName, currentRut, currentCourse, currentTeacher, coordinatorName, apoderadoName, dateStr, negativeCount, docObservations, selectedAnnsObjects };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs">
        <p className="mb-3 font-semibold text-neutral-500 text-xs uppercase tracking-wider">
          Acciones del Documento
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-neutral-800"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button
            type="button"
            onClick={onExportPDF}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-red-700"
          >
            <FileDown className="h-4 w-4" /> Descargar PDF
          </button>
          <button
            type="button"
            onClick={onExportWord}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" /> Descargar Word
          </button>
        </div>
      </div>

      <div className="mx-auto min-h-[297mm] w-[210mm] rounded-xl border border-neutral-200 bg-white p-8 shadow-lg print:border-none print:p-0 print:shadow-none">
        <div className="mb-5 flex items-center gap-4 border-neutral-300 border-b-2 pb-5">
          <img src={LOGO_BASE64} alt="Logo Colegio" className="h-16 w-auto shrink-0 object-contain" />
          <div className="flex flex-col">
            <span className="font-semibold text-[10px] text-neutral-500 uppercase tracking-widest">
              Fundación Educacional Colegio Carmela Romero de Espinosa
            </span>
            <span className="mt-0.5 font-bold text-neutral-800 text-sm">
              DIRECCIÓN DE CONVIVENCIA ESCOLAR
            </span>
            <span className="text-[11px] text-neutral-500">Año 2026</span>
          </div>
        </div>

        <h2 className="mb-6 text-center font-extrabold text-lg text-neutral-900 uppercase tracking-wide">
          {title}
        </h2>

        {docType === 'amonestacion' && <AmonestacionContent {...sharedProps} />}
        {docType === 'compromiso_conductual' && <CompromisoContent {...sharedProps} customCommitments={customCommitments} />}
        {docType === 'derivacion' && <DerivacionContent {...sharedProps} />}
      </div>
    </div>
  );
}
