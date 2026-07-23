/** @license SPDX-License-Identifier: Apache-2.0 */

import { forwardRef } from 'react';
import type { Annotation } from '@/src/shared/lib/types';
import { LOGO_BASE64 } from '@/src/lib/logoBase64';
import { TITLE_MAP, type DocType, type LetterContent } from './DocumentPreview/docTypes';
import AmonestacionContent from './DocumentPreview/AmonestacionContent';
import CompromisoContent from './DocumentPreview/CompromisoContent';
import DerivacionContent from './DocumentPreview/DerivacionContent';

export interface LetterA4DocumentProps {
  id?: string;
  docType: DocType;
  currentName: string;
  currentRut: string;
  currentCourse: string;
  currentTeacher: string;
  coordinatorName: string;
  inspectorName: string;
  apoderadoName: string;
  dateStr: string;
  negativeCount: number;
  docObservations: string;
  selectedAnnsObjects: Annotation[];
  letterContent: LetterContent;
  className?: string;
}

const LetterA4Document = forwardRef<HTMLDivElement, LetterA4DocumentProps>(function LetterA4Document({
  id = 'document-preview-a4',
  docType,
  currentName,
  currentRut,
  currentCourse,
  currentTeacher,
  coordinatorName,
  inspectorName,
  apoderadoName,
  dateStr,
  negativeCount,
  docObservations,
  selectedAnnsObjects,
  letterContent,
  className = '',
}, ref) {
  const title = TITLE_MAP[docType] ?? 'Documento Disciplinario';
  const sharedProps = {
    currentName,
    currentRut,
    currentCourse,
    currentTeacher,
    coordinatorName,
    inspectorName,
    apoderadoName,
    dateStr,
    negativeCount,
    docObservations,
    selectedAnnsObjects,
    letterContent,
  };

  return (
    <div
      ref={ref}
      id={id}
      className={`mx-auto min-h-[297mm] w-[210mm] max-w-full rounded-xl border border-neutral-200 bg-white p-8 text-neutral-900 shadow-lg ${className}`}
    >
      <div className="mb-5 flex items-center gap-4 border-b-2 border-neutral-300 pb-5">
        <img src={LOGO_BASE64} alt="Logo Colegio" className="h-16 w-auto shrink-0 object-contain" />
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
            Fundación Educacional Colegio Carmela Romero de Espinosa
          </span>
          <span className="mt-0.5 text-sm font-bold text-neutral-800">
            DIRECCIÓN DE CONVIVENCIA ESCOLAR
          </span>
          <span className="text-[11px] text-neutral-500">Año 2026</span>
        </div>
      </div>

      <h2 className="mb-6 text-center text-lg font-extrabold uppercase tracking-wide text-neutral-900">
        {title}
      </h2>

      {docType === 'amonestacion' && <AmonestacionContent {...sharedProps} />}
      {docType === 'compromiso_conductual' && <CompromisoContent {...sharedProps} />}
      {docType === 'derivacion' && <DerivacionContent {...sharedProps} />}
    </div>
  );
});

export default LetterA4Document;
