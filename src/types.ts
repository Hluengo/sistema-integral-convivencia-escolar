export type DisciplinaryStatus = 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';

export interface Student {
  id: string;
  full_name: string;
  course_id: string; // e.g., '1° Medio A', '8° Básico'
  teacher_id: string; // Profesor Jefe
  status: string; // e.g., 'Activo'
  tenant_id?: string;
  annotations_count: number; // Total negative count for semaphoric status
  positive_annotations_count: number; // Total positive annotations
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
  id: string; // ID único del caso/expediente
  student_id: string; // ID del estudiante en Supabase
  student_name: string;
  student_rut?: string;
  student_course: string;
  student_teacher?: string;
  annotations_count: number;
  date_joined: string; // Fecha de ingreso en formato YYYY-MM-DD
  initial_measure: string; // Medida disciplinaria inicial
  regulation_basis: string; // Fundamento reglamentario
  created_by: string; // Usuario que creó el caso
  created_at: string; // Fecha y hora completa (ISO o legible)
  source_file_name: string; // Archivo de Hoja de Vida analizado
  ai_analysis_summary: string; // Resumen del análisis de IA
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

