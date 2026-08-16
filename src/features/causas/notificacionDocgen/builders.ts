/** @license SPDX-License-Identifier: Apache-2.0 */

import type { BitacoraEntry, Causa, ChecklistItem } from '@/shared/lib/types';
import { nowDateOnly, nowIso } from '@/shared/lib/dateUtils';
import { DEFAULT_NOTIFICATION_CONTENT, NOTIFICACION_TITLE } from './defaultContent';
import {
  CAUSA_DOCUMENT_TYPE,
  NOTIFICACION_TEMPLATE_VERSION,
  isNotificationContent,
  type CausaDocumentSnapshot,
  type NotificacionExpedienteData,
  type NotificationContent,
} from './types';

/** Firma de la persona que emite la notificación. */
export function getNotificacionResponsable(causa: Causa): string {
  const responsable = causa.responsable;
  if (!responsable) return 'Dirección de Convivencia Escolar';
  return responsable.split(' (')[0] || 'Dirección de Convivencia Escolar';
}

/**
 * Datos automáticos del expediente para la notificación.
 *
 * Respeta el modo privacidad: con privacyMode activo se usa el nombre
 * protegido (nnaProtectedName) y nunca se auto-completa el RUN.
 */
export function buildNotificacionExpedienteData(
  causa: Causa,
  privacyMode: boolean,
): NotificacionExpedienteData {
  return {
    expedienteId: causa.id,
    studentName: privacyMode ? causa.nnaProtectedName : causa.estudianteNombre,
    course: causa.estudianteCurso,
    fechaApertura: causa.fechaApertura,
    responsable: getNotificacionResponsable(causa),
    tipoInfraccion: causa.tipoInfraccion,
    estadoActual: causa.estadoActual,
    observaciones: causa.observaciones || '',
    medidasEjecutadas: Array.isArray(causa.medidasEjecutadas) ? causa.medidasEjecutadas : [],
  };
}

function toLowerSeverityLabel(tipoInfraccion: Causa['tipoInfraccion']): string {
  return tipoInfraccion.toLocaleLowerCase('es-CL');
}

function buildCalificacionFalta(causa: Causa): string {
  return `De forma preliminar, y sin constituir sanción anticipada, los antecedentes registrados se califican como falta ${toLowerSeverityLabel(causa.tipoInfraccion)}, conforme a la tipificación vigente del RICE.`;
}

function alignSeverityReferences(text: string, tipoInfraccion: Causa['tipoInfraccion']): string {
  const severityReference = `falta ${toLowerSeverityLabel(tipoInfraccion)}`;
  return text.replace(/\bfalta\s+(?:leve|grave|muy\s+grave|grav[ií]sima)\b/gi, severityReference);
}

/**
 * Registros reales de la bitácora (evidencias, entrevistas, notificaciones)
 * que alimentan la sección de antecedentes. Solo se usa texto que ya existe
 * en el expediente: nunca se inventan hechos.
 */
function listBitacoraAntecedentes(bitacora: BitacoraEntry[]): string[] {
  return bitacora
    .filter((entry) => entry.tipo === 'Evidencia' || entry.tipo === 'Entrevista')
    .slice(0, 12)
    .map((entry) => {
      const doc = entry.documentoAdjunto ? ' (documento adjunto)' : '';
      return `- ${entry.fecha}: ${entry.titulo}${doc}`;
    });
}

/**
 * Texto base precargado: mezcla los datos reales del expediente con la
 * plantilla base. hallazgoIncidente usa las observaciones de la causa y
 * evidenciaTestimonios lista los antecedentes reales de la bitácora; el resto
 * queda con la plantilla institucional editable.
 */
export function buildPrefilledNotificationContent(
  causa: Causa,
  savedContent?: NotificationContent | null,
): NotificationContent {
  if (savedContent && isNotificationContent(savedContent)) return savedContent;

  const antecedentes = listBitacoraAntecedentes(causa.bitacora);
  const hallazgo = alignSeverityReferences(causa.observaciones.trim(), causa.tipoInfraccion);

  return {
    ...DEFAULT_NOTIFICATION_CONTENT,
    hallazgoIncidente: hallazgo ? hallazgo : DEFAULT_NOTIFICATION_CONTENT.hallazgoIncidente,
    evidenciaTestimonios:
      antecedentes.length > 0
        ? `Antecedentes registrados en el expediente:\n${antecedentes.join('\n')}`
        : DEFAULT_NOTIFICATION_CONTENT.evidenciaTestimonios,
    calificacionFalta: buildCalificacionFalta(causa),
  };
}

/**
 * Snapshot completo del documento a guardar. Captura el estado del
 * expediente al momento de la emisión para reimprimir sin regenerar.
 */
export function buildCausaDocumentSnapshot(params: {
  causa: Causa;
  privacyMode: boolean;
  content: NotificationContent;
  apoderadoName: string;
  emittedBy: string;
}): CausaDocumentSnapshot {
  return {
    templateVersion: NOTIFICACION_TEMPLATE_VERSION,
    docType: CAUSA_DOCUMENT_TYPE,
    title: NOTIFICACION_TITLE,
    content: params.content,
    expediente: buildNotificacionExpedienteData(params.causa, params.privacyMode),
    studentName: params.privacyMode ? params.causa.nnaProtectedName : params.causa.estudianteNombre,
    apoderadoName: params.apoderadoName,
    emittedBy: params.emittedBy || getNotificacionResponsable(params.causa),
    emissionDate: nowDateOnly(),
    emittedAt: nowIso(),
  };
}

/** Hito chk_rec_3 completado por la emisión de la notificación. */
export function buildNotificacionHito(
  causa: Causa,
  snapshot: CausaDocumentSnapshot,
): ChecklistItem {
  const base = causa.checklistDebidoProceso.find((item) => item.id === 'chk_rec_3');
  return {
    id: 'chk_rec_3',
    label: base?.label || 'Notificación de Inicio de Indagación',
    descripcion:
      base?.descripcion ||
      'Se informa formalmente al estudiante y al apoderado sobre la apertura del procedimiento disciplinario dentro de plazo reglamentario.',
    completado: true,
    fechaCompletado: nowDateOnly(),
    requeridoPor: base?.requeridoPor || 'Circular 482',
    registradoPor: snapshot.emittedBy,
    observaciones: `Notificación de inicio de indagación emitida con fecha ${snapshot.emissionDate}.`,
  };
}

/** Entrada de bitácora tipo 'Notificación' para la emisión. */
export function buildNotificacionBitacoraEntry(
  causa: Causa,
  snapshot: CausaDocumentSnapshot,
  privacyMode: boolean,
): BitacoraEntry {
  return {
    id: `b_notif_${crypto.randomUUID()}`,
    fecha: nowIso(),
    tipo: 'Notificación',
    titulo: 'Notificación de Inicio de Indagación emitida',
    descripcion: `Se emitió la Notificación de Inicio de Indagación (${snapshot.emissionDate}) para informar formalmente al estudiante y a su apoderado/a sobre la apertura del procedimiento disciplinario. Emitida por: ${snapshot.emittedBy}.`,
    participantes: [
      snapshot.emittedBy,
      privacyMode ? causa.nnaProtectedName : causa.estudianteNombre,
    ],
  };
}

/** Parsea un snapshot persistido de forma segura (nunca confía en el tipo). */
export function parseCausaDocumentSnapshot(
  value: Record<string, unknown> | null | undefined,
): CausaDocumentSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const content = value.content;
  const expediente = value.expediente;
  if (!isNotificationContent(content)) return null;
  if (
    value.templateVersion !== NOTIFICACION_TEMPLATE_VERSION ||
    value.docType !== CAUSA_DOCUMENT_TYPE ||
    !expediente ||
    typeof expediente !== 'object'
  ) {
    return null;
  }
  return {
    templateVersion: NOTIFICACION_TEMPLATE_VERSION,
    docType: CAUSA_DOCUMENT_TYPE,
    title: readOptionalString(value, 'title', ''),
    content,
    expediente: expediente as NotificacionExpedienteData,
    studentName: readOptionalString(value, 'studentName', ''),
    apoderadoName: readOptionalString(value, 'apoderadoName', ''),
    emittedBy: readOptionalString(value, 'emittedBy', ''),
    emissionDate: readOptionalString(value, 'emissionDate', ''),
    emittedAt: readOptionalString(value, 'emittedAt', ''),
  };
}

function readOptionalString(value: Record<string, unknown>, key: string, fallback: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : fallback;
}

/**
 * Payload checklist en snake_case para el RPC mark_causa_document_notified
 * (mismo contrato que save_checklist_snapshot).
 */
export function buildChecklistItemPayload(item: ChecklistItem): Record<string, unknown> {
  return {
    id: item.id,
    label: item.label,
    descripcion: item.descripcion,
    completado: item.completado,
    fecha_completado: item.fechaCompletado || null,
    requerido_por: item.requeridoPor,
    registrado_por: item.registradoPor || null,
    observaciones: item.observaciones || null,
    documento_nombre: item.documentoNombre || null,
    documento_url: item.documentoUrl || null,
  };
}

/**
 * Payload bitácora en snake_case para el RPC mark_causa_document_notified
 * (mismo contrato que save_bitacora_snapshot).
 */
export function buildBitacoraEntryPayload(entry: BitacoraEntry): Record<string, unknown> {
  return {
    id: entry.id,
    fecha: entry.fecha,
    tipo: entry.tipo,
    titulo: entry.titulo,
    descripcion: entry.descripcion,
    participantes: entry.participantes || [],
    documento_adjunto: entry.documentoAdjunto || null,
  };
}
