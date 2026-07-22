/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum EstadoCausa {
  // Phase 1: Recepción y Apertura
  DENUNCIA_RECEPCIONADA = 'Recepción de Denuncia',
  ANTECEDENTES_REVISION_INICIAL = 'Revisión Inicial de Antecedentes',
  INICIO_INDAGACION_NOTIFICADO = 'Notificación de Inicio de Indagación',

  // Phase 2: Investigación
  EN_PROCESO_INDAGACION = 'En Proceso de Indagación',
  RECOPILACION_EVIDENCIAS_CURSO = 'Recopilación de Evidencias en Curso',
  DERIVADO_A_MEDIACION = 'Derivado a Mediación',
  MEDIACION_EN_DESARROLLO = 'Mediación en Desarrollo',
  MEDIACION_CERRADA_ACUERDO = 'Mediación Cerrada con Acuerdo',
  MEDIACION_FRACASADA_RETORNO = 'Mediación Fracasada – Retorno a Indagación',

  // Phase 3: Análisis y Resolución
  INFORME_CONCLUYENTE_ELABORACION = 'Informe Cierre de Indagación en Elaboración',
  INFORME_CONCLUYENTE_EMITIDO = 'Informe Cierre de Indagación Emitido',
  ENTREVISTA_DISCIPLINARIA_PENDIENTE = 'Entrevista Disciplinaria Pendiente',
  ENTREVISTA_DISCIPLINARIA_REALIZADA = 'Entrevista Disciplinaria Realizada',
  RESOLUCION_ELABORACION = 'Informe Concluyente en Elaboración',
  RESOLUCION_FINAL_NOTIFICADA = 'Informe Concluyente Emitido',

  // Phase 4: Apelación
  EN_PLAZO_APELACION = 'En Plazo de Apelación',
  APELACION_RECEPCIONADA = 'Apelación Recepcionada',
  APELACION_REVISION_RECTORIA = 'Apelación en Revisión por Rectoría',
  APELACION_RESUELTA = 'Apelación Resuelta',
  RESOLUCION_EJECUTORIADA = 'Resolución Ejecutoriada',

  // Phase 5: Seguimiento
  MEDIDA_EJECUCION = 'Medida en Ejecución',
  PROCESO_SEGUIMIENTO = 'En Proceso de Seguimiento',
  SEGUIMIENTO_FINALIZADO = 'Seguimiento Finalizado',
  CAUSA_CERRADA = 'Causa Cerrada',
}

export type FaseProcedimental =
  | 'Recepción'
  | 'Investigación'
  | 'Resolución'
  | 'Apelación'
  | 'Seguimiento';

export interface BitacoraEntry {
  id: string;
  fecha: string;
  tipo: 'Entrevista' | 'Evidencia' | 'Notificación' | 'Mediación' | 'Resolución' | 'Otro';
  titulo: string;
  descripcion: string;
  participantes: string[];
  documentoAdjunto?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  descripcion: string;
  completado: boolean;
  fechaCompletado?: string;
  requeridoPor: 'Circular 482' | 'Ley 21809' | 'Reglamento Interno' | 'Ambas';
  registradoPor?: string;
  observaciones?: string;
  documentoNombre?: string;
  documentoUrl?: string;
}

export type TipoInfraccion = 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima';

export interface Causa {
  id: string; // e.g. "DC-2026-014"
  estudianteNombre: string;
  estudianteCurso: string;
  nnaProtectedName: string; // e.g. "J.P.M."
  runEstudiante: string; // e.g. "23.456.789-K"
  fechaApertura: string;
  estadoActual: EstadoCausa;
  tipoInfraccion: TipoInfraccion;
  responsable: string;
  comprometeAulaSegura: boolean; // Si activa Aula Segura, los plazos bajan a 10 días hábiles
  fechaUltimaActualizacion: string;
  observaciones: string;
  bitacora: BitacoraEntry[];
  checklistDebidoProceso: ChecklistItem[];
  conductaRiceId?: string;
  medidasEjecutadas?: string[];

  // === CAMPOS LEGALES OBLIGATORIOS (Ley 21809, Art. 16E) ===

  // Canal seguro y confidencial de denuncias
  esDenunciaConfidencial?: boolean;
  denunciantAnonimo?: boolean;
  identidadReservada?: boolean;

  // Control de plazos legales
  fechaInicioInvestigacion?: string;
  plazoInvestigacionDias?: number; // Máximo 60 días (2 meses)
  fechaLimiteInvestigacion?: string;

  // Suspensión (máximo 15 días hábiles)
  fechaInicioSuspension?: string;
  duracionSuspensionDias?: number;
  fechaFinSuspension?: string;
  monitoreoPedagogico?: boolean;

  // Notificación a Superintendencia (5 días hábiles para expulsión)
  requiereNotificacionSuperintendencia?: boolean;
  fechaNotificacionSuperintendencia?: string;
  plazoNotificacionDias?: number; // Máximo 5 días hábiles
  fechaLimiteNotificacion?: string;

  // Protección de víctimas (Ley 21809, Art. 16E, letra j)
  medidasProteccionVictima?: string[];
  medidasProteccionDenunciado?: string[];

  // Registro de NEE/Discapacidad (para evitar sanciones discriminatorias)
  estudianteTieneNEE?: boolean;
  tipoNEE?: string;
  sancionesNEEDesactivadas?: boolean;
}

export interface Statistics {
  total: number;
  porFase: Record<FaseProcedimental, number>;
  porGravedad: Record<TipoInfraccion, number>;
  conPlazoCritico: number; // menos de 3 días para vencer
  aulaSeguraActivas: number;
}

export type UserRole = 'convivencia_escolar' | 'director_rector' | 'mediador' | 'docente';

// ============================================================
// Tipos para Gestión de Anotaciones
// ============================================================

export type DisciplinaryStatus = 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';

export interface AnotacionStudent {
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
  course_name?: string;
  ai_analysis?: AnnotationSummary;
}

export interface Annotation {
  id: string;
  student_id: string;
  text: string;
  date: string;
  severity: 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima';
  registered_by: string;
  type: 'Positiva' | 'Negativa' | 'Información';
  pdf_file_path?: string | null;
}

export interface AnnotationSummary {
  negativas: number;
  positivas: number;
  informativas: number;
}

export interface DocumentAnalysis {
  id: string;
  student_id: string;
  file_name: string;
  negativas: number;
  positivas: number;
  informativas: number;
  analyzed_at: string;
  tenant_id: string;
  created_at: string;
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
