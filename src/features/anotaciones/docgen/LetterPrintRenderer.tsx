/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation, CartaDisciplinaria } from '@/src/shared/lib/types';
import { mapLetterTypeToDocType } from '@/src/shared/lib/domain/disciplinaryStage';
import LetterA4Document from './LetterA4Document';
import { DEFAULT_LETTER_CONTENT, type DocType, type LetterContent } from './DocumentPreview/docTypes';

const EMPTY_ANNOTATIONS: Annotation[] = [];

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
  annotations = EMPTY_ANNOTATIONS,
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

  return (
    <LetterA4Document
      id="document-preview-a4"
      docType={docType}
      currentName={currentName}
      currentRut={student?.rut || (typeof snapshotStudent?.rut === 'string' ? snapshotStudent.rut : '') || ''}
      currentCourse={currentCourse}
      currentTeacher={student?.teacher_name || 'Sin Profesor'}
      coordinatorName={getSnapshotString(snapshot, 'coordinatorName') || carta.supervisor_name || ''}
      inspectorName={getSnapshotString(snapshot, 'inspectorName') || carta.emitted_by || ''}
      apoderadoName={getSnapshotString(snapshot, 'apoderadoName') || carta.apoderado_name || ''}
      dateStr={getSnapshotString(snapshot, 'emissionDate') || formatEmissionDate(carta.emission_date)}
      negativeCount={Number(snapshot?.negativeCount) || Number(carta.annotations_count) || annotations.length}
      docObservations={carta.observations || ''}
      selectedAnnsObjects={annotations}
      letterContent={letterContent}
    />
  );
}