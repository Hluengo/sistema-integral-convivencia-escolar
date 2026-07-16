/** @license SPDX-License-Identifier: Apache-2.0 */

export type DisciplinaryStatus = 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';

export type AppRole = 'admin' | 'direccion' | 'convivencia' | 'inspectoria' | 'profesor_jefe';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: AppRole;
  course_ids?: string[];
}

export interface Student {
  id: string;
  full_name: string;
  course_id: string;
  teacher_id: string;
  status: string;
  tenant_id?: string;
  annotations_count: number;
  positive_annotations_count: number;
  last_annotation_date?: string;
  disciplinary_status: DisciplinaryStatus;
  rut?: string;
}

export interface Annotation {
  id: string;
  student_id: string;
  text: string;
  date: string;
  severity: 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima';
  registered_by: string;
  type: 'Positiva' | 'Negativa';
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  useLocalStorageFallback: boolean;
  studentsTable: string;
  annotationsTable: string;
  idCol: string;
  fullNameCol: string;
  courseCol: string;
  teacherCol: string;
  statusCol: string;
  tenantCol: string;
}

export interface DisciplinaryCase {
  id: string;
  student_id: string;
  student_name: string;
  student_rut?: string;
  student_course: string;
  student_teacher?: string;
  annotations_count: number;
  date_joined: string;
  initial_measure: string;
  regulation_basis: string;
  created_by: string;
  created_at: string;
  source_file_name: string;
  ai_analysis_summary: string;
  detected_annotations: {
    text: string;
    date: string;
    severity: 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima';
    registered_by: string;
    type: 'Positiva' | 'Negativa';
  }[];
}

export interface CartaDisciplinaria {
  id: string;
  student_id: string;
  letter_type: 'Amonestación Escrita' | 'Carta de Compromiso Conductual';
  emission_date: string;
  status: 'Vigente' | 'Cumplida' | 'Incumplida' | 'Anulada';
  emitted_by: string;
  supervisor_name?: string;
  apoderado_name: string;
  annotations_count: number;
  student_name: string;
  course: string;
  regulation_basis: string;
  observations?: string;
  created_at: string;
}

export interface EtapaDisciplinaria {
  id: string;
  student_id: string;
  step_number: number;
  stage_name: string;
  responsible: string;
  transition_date: string;
  comment?: string;
  created_at: string;
}
