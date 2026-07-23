/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation, CartaDisciplinaria } from '@/src/shared/lib/types';
import { LOGO_BASE64 } from '@/src/lib/logoBase64';
import { mapLetterTypeToDocType } from '@/src/shared/lib/domain/disciplinaryStage';
import AmonestacionContent from './DocumentPreview/AmonestacionContent';
import CompromisoContent from './DocumentPreview/CompromisoContent';
import DerivacionContent from './DocumentPreview/DerivacionContent';
import { TITLE_MAP, type DocType } from './DocumentPreview/docTypes';

export interface LetterPrintStudent {
  full_name: string;
  course_name?: string;
  course_id?: string;
  rut?: string;
  teacher_name?: string;
}

interface LetterPrintRendererProps {
  carta: CartaDisciplinaria;
  student?: LetterPrintStudent;
  annotations?: Annotation[];
}

function formatEmissionDate(date: string): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function LetterPrintRenderer({
  carta,
  student,
  annotations = [],
}: LetterPrintRendererProps) {
  const docType = mapLetterTypeToDocType(carta.letter_type) || 'amonestacion';
  const currentName = student?.full_name || carta.student_name;
  const currentCourse = student?.course_name || student?.course_id || carta.course || '-';
  const sharedProps = {
    currentName,
    currentRut: student?.rut || '',
    currentCourse,
    currentTeacher: student?.teacher_name || 'Sin Profesor',
    coordinatorName: carta.supervisor_name || '',
    inspectorName: carta.emitted_by || '',
    apoderadoName: carta.apoderado_name || '',
    dateStr: formatEmissionDate(carta.emission_date),
    negativeCount: Number(carta.annotations_count) || annotations.length,
    docObservations: carta.observations || '',
    selectedAnnsObjects: annotations,
  };
  const title = TITLE_MAP[docType as DocType] ?? carta.letter_type;

  return (
    <div
      id="letter-print-a4"
      className="mx-auto min-h-[297mm] w-[210mm] bg-white p-8 text-neutral-900 print:p-0"
    >
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
      {docType === 'compromiso_conductual' && <CompromisoContent {...sharedProps} />}
      {docType === 'derivacion' && <DerivacionContent {...sharedProps} />}
    </div>
  );
}