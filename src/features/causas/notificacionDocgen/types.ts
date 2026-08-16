/** @license SPDX-License-Identifier: Apache-2.0 */

/**
 * Tipos del generador de Notificación de Inicio de Indagación.
 *
 * Documento oficial de causa en formato hoja Carta (216x279mm), sin IA:
 * plantilla fija editable, vista previa, impresión y trazabilidad por
 * snapshot. Aislado del DocType de cartas disciplinarias y del DraftPanel.
 */

export const CAUSA_DOCUMENT_TYPE = 'notificacion_inicio_indagacion' as const;
export type CausaDocumentType = typeof CAUSA_DOCUMENT_TYPE;

export type CausaDocumentStatus = 'Pendiente' | 'Notificada' | 'Anulada';

export const NOTIFICACION_TEMPLATE_VERSION = 'notificacion-inicio-indagacion-v1';

/** Las 9 secciones numeradas editables del documento. */
export interface NotificationContent {
  fundamentoProcedimiento: string;
  hallazgoIncidente: string;
  evidenciaTestimonios: string;
  atenuantesAgravantes: string;
  calificacionFalta: string;
  medidasEnEvaluacion: string;
  advertenciaEspecial: string;
  garantiasDebidoProceso: string;
  confidencialidad: string;
}

export const NOTIFICATION_CONTENT_FIELDS: Array<keyof NotificationContent> = [
  'fundamentoProcedimiento',
  'hallazgoIncidente',
  'evidenciaTestimonios',
  'atenuantesAgravantes',
  'calificacionFalta',
  'medidasEnEvaluacion',
  'advertenciaEspecial',
  'garantiasDebidoProceso',
  'confidencialidad',
];

/** Datos del expediente capturados al momento de emitir (trazabilidad). */
export interface NotificacionExpedienteData {
  expedienteId: string;
  studentName: string;
  course: string;
  fechaApertura: string;
  responsable: string;
  tipoInfraccion: string;
  estadoActual: string;
  observaciones: string;
  medidasEjecutadas: string[];
}

/** Snapshot completo del documento emitido. */
export interface CausaDocumentSnapshot {
  templateVersion: typeof NOTIFICACION_TEMPLATE_VERSION;
  docType: CausaDocumentType;
  title: string;
  content: NotificationContent;
  expediente: NotificacionExpedienteData;
  studentName: string;
  apoderadoName: string;
  emittedBy: string;
  emissionDate: string;
  emittedAt: string;
}

export function isNotificationContent(value: unknown): value is NotificationContent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<keyof NotificationContent, unknown>;
  return NOTIFICATION_CONTENT_FIELDS.every((field) => typeof candidate[field] === 'string');
}
