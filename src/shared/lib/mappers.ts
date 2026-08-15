/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation, CartaDisciplinaria, EtapaDisciplinaria } from './types';
import { getYearFromDateOnly } from '../../shared/lib/dateUtils';

export interface InspectorateRecord {
  id: string;
  student_id: string | null;
  date_time: string;
  observation: string;
  severity: string;
  type: string;
  registered_by: string | null;
  created_at: string | null;
  created_by: string | null;
  pdf_file_path?: string | null;
}

export function mapInspectorateToAnnotation(row: InspectorateRecord): Annotation {
  return {
    id: row.id,
    student_id: row.student_id || '',
    text: row.observation,
    date: row.date_time,
    severity: row.severity as Annotation['severity'],
    registered_by: row.registered_by || '',
    type: (row.type === 'Positiva'
      ? 'Positiva'
      : row.type === 'Información'
        ? 'Información'
        : 'Negativa') as Annotation['type'],
    pdf_file_path: row.pdf_file_path || null,
  };
}

export interface CauseRow {
  id: string;
  student_id: string;
  letter_type: string;
  emission_date: string;
  status: string | null;
  emitted_by: string;
  supervisor_name?: string | null;
  apoderado_name: string;
  annotations_count: number;
  origin?: string | null;
  school_year?: number | null;
  student_name: string;
  course: string;
  regulation_basis: string;
  observations?: string | null;
  created_at: string | null;
  content_snapshot?: Record<string, unknown> | null;
}

export function mapCauseRowToCarta(row: CauseRow): CartaDisciplinaria {
  const validStatus = (s: string): CartaDisciplinaria['status'] => {
    if (s === 'Cumplida' || s === 'Incumplida' || s === 'Anulada') return s;
    return 'Vigente';
  };
  return {
    id: row.id,
    student_id: row.student_id,
    letter_type: row.letter_type as CartaDisciplinaria['letter_type'],
    emission_date: row.emission_date,
    status: validStatus(row.status || ''),
    emitted_by: row.emitted_by,
    supervisor_name: row.supervisor_name || undefined,
    apoderado_name: row.apoderado_name,
    annotations_count: row.annotations_count,
    origin: row.origin === 'physical' ? 'physical' : 'platform',
    school_year: row.school_year ?? getYearFromDateOnly(row.emission_date),
    student_name: row.student_name,
    course: row.course,
    regulation_basis: row.regulation_basis,
    observations: row.observations || undefined,
    created_at: row.created_at || row.emission_date,
    content_snapshot: row.content_snapshot || null,
  };
}

export interface StageRow {
  id: string;
  student_id: string;
  step_number: number;
  stage_name: string;
  responsible: string;
  transition_date: string | null;
  comment?: string | null;
  created_at: string | null;
}

export function mapStageRowToEtapa(row: StageRow): EtapaDisciplinaria {
  return {
    id: row.id,
    student_id: row.student_id,
    step_number: row.step_number,
    stage_name: row.stage_name,
    responsible: row.responsible,
    transition_date: row.transition_date || row.created_at || new Date().toISOString(),
    comment: row.comment || undefined,
    created_at: row.created_at || row.transition_date || new Date().toISOString(),
  };
}
