/** @license SPDX-License-Identifier: Apache-2.0 */

import type {
  Annotation,
  CartaDisciplinaria,
  EtapaDisciplinaria,
} from '../types';

export interface InspectorateRecord {
  id: string;
  student_id: string;
  text: string;
  date: string;
  created_at: string;
  created_by: string | null;
  annotation_type: string | null;
}

export function mapInspectorateToAnnotation(row: InspectorateRecord): Annotation {
  return {
    id: row.id,
    student_id: row.student_id,
    text: row.text,
    date: row.date,
    severity: 'Grave',
    registered_by: row.created_by ?? '',
    type: (row.annotation_type === 'Positiva' ? 'Positiva' : 'Negativa') as 'Positiva' | 'Negativa',
  };
}

export interface CauseRow {
  id: string;
  student_id: string;
  letter_type: string;
  emission_date: string;
  status: string;
  emitted_by: string;
  apoderado_name: string;
  annotations_count: number;
  student_name: string;
  course: string;
  regulation_basis: string;
  created_at: string;
}

export function mapCauseRowToCarta(row: CauseRow): CartaDisciplinaria {
  const validStatus = (s: string): 'Vigente' | 'Cumplida' | 'Incumplida' | 'Anulada' => {
    if (s === 'Cumplida' || s === 'Incumplida' || s === 'Anulada') return s;
    return 'Vigente';
  };
  return {
    id: row.id,
    student_id: row.student_id,
    letter_type: row.letter_type as 'Amonestación Escrita' | 'Carta de Compromiso Conductual',
    emission_date: row.emission_date,
    status: validStatus(row.status),
    emitted_by: row.emitted_by,
    apoderado_name: row.apoderado_name,
    annotations_count: row.annotations_count,
    student_name: row.student_name,
    course: row.course,
    regulation_basis: row.regulation_basis,
    created_at: row.created_at,
  };
}

export interface StageRow {
  id: string;
  student_id: string;
  step_number: number;
  stage_name: string;
  responsible: string;
  transition_date: string;
  created_at: string;
}

export function mapStageRowToEtapa(row: StageRow): EtapaDisciplinaria {
  return {
    id: row.id,
    student_id: row.student_id,
    step_number: row.step_number,
    stage_name: row.stage_name,
    responsible: row.responsible,
    transition_date: row.transition_date,
    created_at: row.created_at,
  };
}
