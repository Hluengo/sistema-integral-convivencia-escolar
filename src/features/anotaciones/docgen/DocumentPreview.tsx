/** @license SPDX-License-Identifier: Apache-2.0 */

import { forwardRef } from 'react';
import { Printer } from 'lucide-react';
import type { Annotation } from '../../../types';
import type { DocType, LetterContent } from './DocumentPreview/docTypes';
import LetterA4Document from './LetterA4Document';
import LetterPreviewViewport from './LetterPreviewViewport';

interface DocumentPreviewProps {
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
  selectedAnnsObjects: Annotation[];
  letterContent: LetterContent;
  onPrint: () => void;
  onOverflowChange?: (hasOverflow: boolean) => void;
}

const DocumentPreview = forwardRef<HTMLDivElement, DocumentPreviewProps>(function DocumentPreview(
  {
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
    selectedAnnsObjects,
    letterContent,
    onPrint,
    onOverflowChange,
  },
  ref
) {
  return (
    <div className="space-y-4">
      <div className="mx-auto w-full max-w-[216mm] rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Acciones del Documento
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-700 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-neutral-800"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
      </div>

      <LetterPreviewViewport onOverflowChange={onOverflowChange}>
        <LetterA4Document
          ref={ref}
          id="document-preview-a4"
          docType={docType}
          currentName={currentName}
          currentRut={currentRut}
          currentCourse={currentCourse}
          currentTeacher={currentTeacher}
          coordinatorName={coordinatorName}
          inspectorName={inspectorName}
          apoderadoName={apoderadoName}
          dateStr={dateStr}
          negativeCount={negativeCount}
          selectedAnnsObjects={selectedAnnsObjects}
          letterContent={letterContent}
        />
      </LetterPreviewViewport>
    </div>
  );
});

export default DocumentPreview;
