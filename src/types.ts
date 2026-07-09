/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum EstadoCausa {
  // Phase 1: Recepción y Apertura
  DENUNCIA_RECEPCIONADA = "Denuncia Recepcionada",
  ANTECEDENTES_REVISION_INICIAL = "Antecedentes en Revisión Inicial",
  INICIO_INDAGACION_NOTIFICADO = "Inicio de Indagación Notificado",

  // Phase 2: Investigación
  EN_PROCESO_INDAGACION = "En Proceso de Indagación",
  RECOPILACION_EVIDENCIAS_CURSO = "Recopilación de Evidencias en Curso",
  DERIVADO_A_MEDIACION = "Derivado a Mediación",
  MEDIACION_EN_DESARROLLO = "Mediación en Desarrollo",
  MEDIACION_CERRADA_ACUERDO = "Mediación Cerrada con Acuerdo",
  MEDIACION_FRACASADA_RETORNO = "Mediación Fracasada – Retorno a Indagación",

  // Phase 3: Análisis y Resolución
  INFORME_CONCLUYENTE_ELABORACION = "Informe Concluyente en Elaboración",
  INFORME_CONCLUYENTE_EMITIDO = "Informe Concluyente Emitido",
  ENTREVISTA_DISCIPLINARIA_PENDIENTE = "Entrevista Disciplinaria Pendiente",
  ENTREVISTA_DISCIPLINARIA_REALIZADA = "Entrevista Disciplinaria Realizada",
  RESOLUCION_ELABORACION = "Resolución en Elaboración",
  RESOLUCION_FINAL_NOTIFICADA = "Resolución Final Notificada",

  // Phase 4: Impugnación
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

export type FaseProcedimental = 'Recepción' | 'Investigación' | 'Resolución' | 'Impugnación' | 'Seguimiento';

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
}

export interface Statistics {
  total: number;
  porFase: Record<FaseProcedimental, number>;
  porGravedad: Record<TipoInfraccion, number>;
  conPlazoCritico: number; // menos de 3 días para vencer
  aulaSeguraActivas: number;
}

export type UserRole = 'convivencia_escolar' | 'director_rector' | 'mediador' | 'docente';
