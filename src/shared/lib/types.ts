/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum EstadoCausa {
  // Phase 1: Recepción y Apertura
  DENUNCIA_RECEPCIONADA = "Recepción de Denuncia",
  ANTECEDENTES_REVISION_INICIAL = "Revisión Inicial de Antecedentes",
  INICIO_INDAGACION_NOTIFICADO = "Notificación de Inicio de Indagación",

  // Phase 2: Investigación
  EN_PROCESO_INDAGACION = "En Proceso de Indagación",
  RECOPILACION_EVIDENCIAS_CURSO = "Recopilación de Evidencias en Curso",
  DERIVADO_A_MEDIACION = "Derivado a Mediación",
  MEDIACION_EN_DESARROLLO = "Mediación en Desarrollo",
  MEDIACION_CERRADA_ACUERDO = "Mediación Cerrada con Acuerdo",
  MEDIACION_FRACASADA_RETORNO = "Mediación Fracasada – Retorno a Indagación",

  // Phase 3: Análisis y Resolución
  INFORME_CONCLUYENTE_ELABORACION = "Informe Cierre de Indagación en Elaboración",
  INFORME_CONCLUYENTE_EMITIDO = "Informe Cierre de Indagación Emitido",
  ENTREVISTA_DISCIPLINARIA_PENDIENTE = "Entrevista Disciplinaria Pendiente",
  ENTREVISTA_DISCIPLINARIA_REALIZADA = "Entrevista Disciplinaria Realizada",
  RESOLUCION_ELABORACION = "Informe Concluyente en Elaboración",
  RESOLUCION_FINAL_NOTIFICADA = "Informe Concluyente Emitido",

  // Phase 4: Apelación
  EN_PLAZO_APELACION = "En Plazo de Apelación",
  APELACION_RECEPCIONADA = "Apelación Recepcionada",
  APELACION_REVISION_RECTORIA = "Apelación en Revisión por Rectoría",
  APELACION_RESUELTA = "Apelación Resuelta",
  RESOLUCION_EJECUTORIADA = "Resolución Ejecutoriada",

  // Phase 5: Seguimiento
  MEDIDA_EJECUCION = "Medida en Ejecución",
  PROCESO_SEGUIMIENTO = "En Proceso de Seguimiento",
  SEGUIMIENTO_FINALIZADO = "Seguimiento Finalizado",
  CAUSA_CERRADA = "Causa Cerrada",
}

export type FaseProcedimental =
  "Recepción" | "Investigación" | "Resolución" | "Apelación" | "Seguimiento";

export interface BitacoraEntry {
  id: string;
  fecha: string;
  tipo:
    | "Entrevista"
    | "Evidencia"
    | "Notificación"
    | "Mediación"
    | "Resolución"
    | "Citación"
    | "Correo"
    | "Descargo"
    | "Otro";
  titulo: string;
  descripcion: string;
  participantes: string[];
  documentoAdjunto?: string;
  compartidoGrupal?: boolean;
  /** Causa propietaria cuando el registro fue heredado desde un incidente grupal. */
  causaOrigenId?: string;
}

export type MilestoneApplicability = "pendiente" | "aplica" | "no_aplica";
export type MilestoneStatus =
  | "no_iniciado"
  | "en_desarrollo"
  | "cumplido"
  | "vencido"
  | "no_aplica"
  | "invalidado";

export interface ChecklistItem {
  id: string;
  label: string;
  descripcion: string;
  completado: boolean;
  obligatorio?: boolean;
  aplicabilidad?: MilestoneApplicability;
  estado?: MilestoneStatus;
  fundamentoNoAplica?: string;
  fechaInicio?: string;
  fechaLimite?: string;
  resultado?: string;
  bloqueanteParaAvanzar?: boolean;
  bloqueanteParaCerrar?: boolean;
  fechaCompletado?: string;
  requeridoPor: "Circular 482" | "Ley 21809" | "Reglamento Interno" | "Ambas";
  registradoPor?: string;
  observaciones?: string;
  documentoNombre?: string;
  documentoUrl?: string;
}

export interface ChecklistProgressEntry {
  id: string;
  causaId: string;
  incidenteId?: string;
  checklistItemId: string;
  title: string;
  description: string;
  entryType: BitacoraEntry["tipo"];
  occurredAt: string;
  documentName?: string;
  documentUrl?: string;
  createdBy?: string;
  createdAt: string;
  invalidatedAt?: string;
  invalidatedBy?: string;
  invalidationReason?: string;
}

export type TipoInfraccion = "Leve" | "Grave" | "Muy Grave" | "Gravísima";

export interface Causa {
  id: string; // e.g. "DC-2026-014"
  /** Version 1 para expedientes históricos; versión 2 para casos nuevos. */
  proceduralModelVersion?: 1 | 2;
  studentId?: string;
  incidenteId?: string;
  estudianteNombre: string;
  estudianteCurso: string;
  nnaProtectedName: string; // e.g. "J.P.M."
  runEstudiante: string; // e.g. "23.456.789-K"
  fechaApertura: string;
  estadoActual: EstadoCausa;
  tipoInfraccion: TipoInfraccion;
  responsable: string;
  apoderadoEmail?: string;
  comprometeAulaSegura: boolean;
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
  plazoInvestigacionDias?: number; // 10 días para Muy Grave/Gravísima; 60 para otras faltas
  fechaLimiteInvestigacion?: string;
  plazo24h?: boolean;
  fechaLimite24h?: string;
  fechaLimiteCierre?: string;

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

export interface Incidente {
  id: string;
  tenantId: string;
  fechaHora: string;
  lugar: string;
  tipo: string;
  descripcion: string;
  responsable: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentScope = "causa" | "incidente";

export type ExpedienteEventStatus = "vigente" | "rectificado" | "invalidado";
export type ExpedienteDocumentStatus = "vigente" | "invalidado" | "reemplazado";
export type ExpedienteDocumentOrigin = "interno" | "externo" | "importado";
export type ExpedienteDocumentScope = "individual" | "grupal";

export interface ExpedienteEvent {
  id: string;
  tenant_id: string;
  causa_id: string;
  incidente_id: string | null;
  occurred_at: string;
  recorded_at: string;
  recorded_by: string | null;
  event_type: string;
  title: string;
  description: string;
  milestone_id: string | null;
  hecho_id: string | null;
  source_table: string | null;
  source_id: string | null;
  participants: string[];
  status: ExpedienteEventStatus;
  previous_event_id: string | null;
  correction_reason: string | null;
  metadata: Record<string, unknown>;
}

export type ReconsideracionTipo = "reconsideracion" | "apelacion";
export type ReconsideracionEstado =
  "pendiente" | "acogida" | "rechazada" | "desistida" | "vencida";

export interface ReconsideracionRecord {
  id: string;
  tipo: ReconsideracionTipo;
  estado: ReconsideracionEstado;
  solicitadaAt: string;
  resueltaAt: string | null;
  solicitadaPor: string | null;
  solicitud: string;
  resolucion: string;
  documentoNombre: string | null;
}

export interface SeguimientoRecord {
  id: string;
  estado: string;
  fecha: string | null;
  descripcion: string;
  titulo: string;
  responsable: string;
  fechaFin: string | null;
  cumplimiento: string;
  evaluacion: string;
}

export type ExpedienteHistoryOrigin = "individual" | "grupal";

export interface ExpedienteHistoryEntry {
  id: string;
  occurredAt: string;
  recordedAt: string | null;
  type: string;
  title: string;
  description: string;
  responsible: string | null;
  participants: string[];
  milestoneId: string | null;
  hechoId: string | null;
  documentNames: string[];
  documentPaths: string[];
  status: "vigente" | "rectificado" | "invalidado";
  origin: ExpedienteHistoryOrigin;
  source: "event" | "bitacora" | "avance" | "reconsideracion" | "seguimiento";
  correctionReason: string | null;
}

export interface ExpedienteDocument {
  id: string;
  tenant_id: string;
  causa_id: string;
  incidente_id: string | null;
  original_name: string;
  display_name: string;
  mime_type: string;
  byte_size: number;
  storage_path: string;
  milestone_id: string | null;
  event_id: string | null;
  hecho_id: string | null;
  document_date: string | null;
  incorporated_at: string;
  incorporated_by: string | null;
  origin: ExpedienteDocumentOrigin;
  scope: ExpedienteDocumentScope;
  version: number;
  status: ExpedienteDocumentStatus;
  invalidated_at: string | null;
  invalidated_by: string | null;
  invalidation_reason: string | null;
  sha256: string | null;
  metadata: Record<string, unknown>;
}

export interface Statistics {
  total: number;
  porFase: Record<FaseProcedimental, number>;
  porGravedad: Record<TipoInfraccion, number>;
  conPlazoCritico: number; // menos de 3 días para vencer
  aulaSeguraActivas: number;
}

export type UserRole =
  "convivencia_escolar" | "director_rector" | "mediador" | "docente";

// ============================================================
// Tipos para Gestión de Anotaciones
// ============================================================

export type DisciplinaryStatus = "Verde" | "Amarillo" | "Naranja" | "Rojo";

export interface AnotacionStudent {
  id: string;
  full_name: string;
  course_id: string;
  teacher_id: string;
  status: string;
  tenant_id?: string;
  annotations_count: number;
  positive_annotations_count: number;
  informative_annotations_count?: number;
  last_annotation_date?: string;
  disciplinary_status: DisciplinaryStatus;
  effective_letter_type?: CartaDisciplinaria["letter_type"] | null;
  rut?: string;
  course_name?: string;
  ai_analysis?: AnnotationSummary;
}

export interface Annotation {
  id: string;
  student_id: string;
  text: string;
  date: string;
  severity: "Leve" | "Grave" | "Muy Grave" | "Gravísima";
  registered_by: string;
  type: "Positiva" | "Negativa" | "Información";
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
  status?: string;
}

export interface CartaDisciplinaria {
  id: string;
  student_id: string;
  letter_type:
    | "Amonestación Escrita"
    | "Carta de Compromiso Conductual"
    | "Ficha de Derivación";
  emission_date: string;
  status: "Vigente" | "Cumplida" | "Incumplida" | "Anulada";
  emitted_by: string;
  supervisor_name?: string;
  apoderado_name: string;
  annotations_count: number;
  origin?: "platform" | "physical";
  school_year?: number;
  student_name: string;
  course: string;
  regulation_basis: string;
  observations?: string;
  created_at: string;
  workflow_status?: "pending" | "completed" | "archived" | "annulled";
  suggested_at?: string | null;
  created_event_at?: string | null;
  registered_at?: string | null;
  printed_at?: string | null;
  processed_manually_at?: string | null;
  processed_note?: string | null;
  archived_at?: string | null;
  archived_note?: string | null;
  annulled_at?: string | null;
  annulled_reason?: string | null;
  source_analysis_id?: string | null;
  source_process_id?: string | null;
  content_snapshot?: Record<string, unknown> | null;
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
