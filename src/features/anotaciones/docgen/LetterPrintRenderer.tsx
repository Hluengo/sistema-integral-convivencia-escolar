/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation, CartaDisciplinaria } from '@/src/shared/lib/types';
import { LOGO_BASE64 } from '@/src/lib/logoBase64';
import { mapLetterTypeToDocType } from '@/src/shared/lib/domain/disciplinaryStage';
import AmonestacionContent from './DocumentPreview/AmonestacionContent';
import CompromisoContent from './DocumentPreview/CompromisoContent';
import DerivacionContent from './DocumentPreview/DerivacionContent';
import { DEFAULT_LETTER_CONTENT, TITLE_MAP, type DocType, type LetterContent } from './DocumentPreview/docTypes';

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

function isLetterContent(value: unknown): value is LetterContent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<keyof LetterContent, unknown>;
  return ['motivo', 'descripcion', 'medida', 'acuerdos', 'cierre', 'observaciones'].every(
    (field) => typeof candidate[field as keyof LetterContent] === 'string'
  );
}

function getSnapshotString(snapshot: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = snapshot?.[key];
  return typeof value === 'string' ? value : null;
}

export default function LetterPrintRenderer({
  carta,
  student,
  annotations = [],
}: LetterPrintRendererProps) {
  const docType = (mapLetterTypeToDocType(carta.letter_type) || 'amonestacion') as DocType;
  const snapshot = carta.content_snapshot;
  const snapshotStudent = snapshot?.student && typeof snapshot.student === 'object'
    ? (snapshot.student as Record<string, unknown>)
    : null;
  const letterContent = isLetterContent(snapshot?.letterContent)
    ? snapshot.letterContent
    : DEFAULT_LETTER_CONTENT[docType];

  const currentName =
    student?.full_name ||
    (typeof snapshotStudent?.fullName === 'string' ? snapshotStudent.fullName : null) ||
    carta.student_name;
  const currentCourse =
    student?.course_name ||
    student?.course_id ||
    (typeof snapshotStudent?.course === 'string' ? snapshotStudent.course : null) ||
    carta.course ||
    '-';
  const sharedProps = {
    currentName,
    currentRut: student?.rut || (typeof snapshotStudent?.rut === 'string' ? snapshotStudent.rut : '') || '',
    currentCourse,
    currentTeacher: student?.teacher_name || 'Sin Profesor',
    coordinatorName: getSnapshotString(snapshot, 'coordinatorName') || carta.supervisor_name || '',
    inspectorName: getSnapshotString(snapshot, 'inspectorName') || carta.emitted_by || '',
    apoderadoName: getSnapshotString(snapshot, 'apoderadoName') || carta.apoderado_name || '',
    dateStr: getSnapshotString(snapshot, 'emissionDate') || formatEmissionDate(carta.emission_date),
    negativeCount: Number(snapshot?.negativeCount) || Number(carta.annotations_count) || annotations.length,
    docObservations: carta.observations || '',
    selectedAnnsObjects: annotations,
    letterContent,
  };
  const title = TITLE_MAP[docType] ?? carta.letter_type;

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
