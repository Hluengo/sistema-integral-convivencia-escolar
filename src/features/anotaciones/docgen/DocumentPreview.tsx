/** @license SPDX-License-Identifier: Apache-2.0 */

import { forwardRef } from 'react';
import { CheckCircle2, Printer } from 'lucide-react';
import type { Annotation } from '../../../types';
import type { DocType, LetterContent } from './DocumentPreview/docTypes';
import LetterA4Document from './LetterA4Document';
import LetterPreviewViewport from './LetterPreviewViewport';
import Button from '@/src/shared/ui/Button';

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
  onMarkProcessed: () => void;
  isProcessing: boolean;
  processingFeedback?: {
    text: string;
    tone: 'info' | 'success' | 'error';
  } | null;
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
    onMarkProcessed,
    isProcessing,
    processingFeedback,
    onOverflowChange,
  },
  ref,
) {
  return (
    <div className="space-y-4">
      <div className="mx-auto w-full max-w-[216mm] rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Acciones del Documento
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="custom"
            onClick={onPrint}
            className="rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-white shadow-xs hover:bg-neutral-800"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button
            variant="custom"
            onClick={onMarkProcessed}
            disabled={isProcessing}
            className="rounded-xl border border-leve-200 bg-leve-50 px-4 py-2.5 font-medium text-leve-700 shadow-xs hover:bg-leve-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isProcessing ? 'Procesando…' : 'Marcar como procesada'}
          </Button>
        </div>
        {processingFeedback && (
          <p
            role={processingFeedback.tone === 'error' ? 'alert' : 'status'}
            className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
              processingFeedback.tone === 'error'
                ? 'bg-gravisima-50 text-gravisima-700'
                : processingFeedback.tone === 'success'
                  ? 'bg-leve-50 text-leve-700'
                  : 'bg-blue-50 text-blue-700'
            }`}
          >
            {processingFeedback.text}
          </p>
        )}
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
