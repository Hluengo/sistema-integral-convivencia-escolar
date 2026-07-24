/** @license SPDX-License-Identifier: Apache-2.0 */

import { forwardRef } from 'react';
import type { Annotation } from '@/src/shared/lib/types';
import { LOGO_BASE64 } from '@/src/lib/logoBase64';
import { TITLE_MAP, type DocType, type LetterContent } from './DocumentPreview/docTypes';
import { LetterInstitutionalHeader, LetterTitle } from './DocumentPreview/SharedComponents';
import AmonestacionContent from './DocumentPreview/AmonestacionContent';
import CompromisoContent from './DocumentPreview/CompromisoContent';
import DerivacionContent from './DocumentPreview/DerivacionContent';
import './letter-document.css';

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
  selectedAnnsObjects: Annotation[];
  letterContent: LetterContent;
  className?: string;
}

const LetterA4Document = forwardRef<HTMLDivElement, LetterA4DocumentProps>(
  function LetterA4Document(
    {
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
      selectedAnnsObjects,
      letterContent,
      className = '',
    },
    ref
  ) {
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
      selectedAnnsObjects,
      letterContent,
    };

    return (
      <div ref={ref} id={id} className={`letter-document ${className}`}>
        <LetterInstitutionalHeader year="2026" logoSrc={LOGO_BASE64} />
        <LetterTitle>{title}</LetterTitle>

        {docType === 'amonestacion' && <AmonestacionContent {...sharedProps} />}
        {docType === 'compromiso_conductual' && <CompromisoContent {...sharedProps} />}
        {docType === 'derivacion' && <DerivacionContent {...sharedProps} />}
      </div>
    );
  }
);

export default LetterA4Document;
