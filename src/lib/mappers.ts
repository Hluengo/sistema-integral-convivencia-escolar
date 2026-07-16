/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation, CartaDisciplinaria, EtapaDisciplinaria } from '../types';

const SEVERITIES = ['Leve', 'Grave', 'Muy Grave', 'Gravísima'] as const;
type Severity = (typeof SEVERITIES)[number];

function asSeverity(value: unknown): Severity {
  if (typeof value === 'string' && (SEVERITIES as readonly string[]).includes(value)) {
    return value as Severity;
  }
  return 'Leve';
}

function asType(value: unknown): 'Positiva' | 'Negativa' {
  return value === 'Positiva' ? 'Positiva' : 'Negativa';
}

/** Mapea fila de inspectorate_records → Annotation de dominio. */
export function mapInspectorateRow(row: Record<string, unknown>): Annotation {
  const dateRaw = String(row.date_time || row.created_at || row.date || '');
  return {
    id: String(row.id),
    student_id: String(row.student_id),
    text: String(row.observation || row.text || row.annotation_text || ''),
    date: dateRaw.includes('T') ? dateRaw.split('T')[0] : dateRaw.slice(0, 10),
    severity: asSeverity(row.severity),
    registered_by: String(row.registered_by || row.author || 'Inspectoría'),
    type: asType(row.type),
  };
}

export function mapCausaRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    student_id: String(row.student_id || ''),
    student_name: String(row.estudiante_nombre || row.student_name || ''),
    student_rut: String(row.run_estudiante || row.student_rut || ''),
    student_course: String(row.estudiante_curso || row.student_course || ''),
    annotations_count_detected: Number(row.annotations_count || row.annotations_count_detected || 0),
    date_joined: String(row.fecha_apertura || row.date_joined || ''),
    initial_measure: String(row.initial_measure || row.estado_actual || ''),
    regulation_basis: String(row.regulation_basis || row.tipo_infraccion || ''),
    created_by: String(row.created_by || row.responsable || ''),
    created_at: String(row.created_at || ''),
    source_file_name: String(row.file_name || row.source_file_name || ''),
    ai_analysis_summary: String(row.analysis_summary || row.ai_analysis_summary || row.observaciones || ''),
  };
}

export function mapCartaRow(row: Record<string, unknown>): CartaDisciplinaria {
  return {
    id: String(row.id),
    student_id: String(row.student_id),
    letter_type: String(row.letter_type) as CartaDisciplinaria['letter_type'],
    emission_date: String(row.emission_date),
    status: String(row.status || 'Vigente') as CartaDisciplinaria['status'],
    emitted_by: String(row.emitted_by),
    supervisor_name: row.supervisor_name ? String(row.supervisor_name) : undefined,
    apoderado_name: String(row.apoderado_name),
    annotations_count: Number(row.annotations_count),
    student_name: String(row.student_name),
    course: String(row.course),
    regulation_basis: String(row.regulation_basis),
    observations: row.observations ? String(row.observations) : undefined,
    created_at: String(row.created_at),
  };
}

export function mapEtapaRow(row: Record<string, unknown>): EtapaDisciplinaria {
  return {
    id: String(row.id),
    student_id: String(row.student_id),
    step_number: Number(row.step_number),
    stage_name: String(row.stage_name),
    responsible: String(row.responsible),
    transition_date: String(row.transition_date),
    comment: row.comment ? String(row.comment) : undefined,
    created_at: String(row.created_at),
  };
}
