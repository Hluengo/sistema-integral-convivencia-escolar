/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  fetchHechoEvidencias,
  fetchHechos,
  type HechoEvidenciaRow,
  type HechoRow,
} from "./hechos.service";
import { fetchChecklistProgress } from "./checklistProgress.service";
import { fetchExpedienteDocuments } from "./expedienteDocuments.service";
import { fetchExpedienteEvents } from "./expedienteEvents.service";
import { fetchCausaDetails } from "./causas.service";
import { fetchReconsideraciones } from "./reconsideracion.service";
import { fetchSeguimiento } from "./seguimiento.service";
import { toDateOnly } from "../../lib/dateUtils";
import type {
  Causa,
  ChecklistItem,
  ChecklistProgressEntry,
  ExpedienteDocument,
  ExpedienteEvent,
  ExpedienteHistoryEntry,
  ReconsideracionRecord,
  SeguimientoRecord,
} from "../../lib/types";

export interface ExpedienteCompleto {
  causa: Causa;
  hitos: ChecklistItem[];
  actuaciones: ExpedienteEvent[];
  avances: ChecklistProgressEntry[];
  hechos: HechoRow[];
  vinculosHechoEvidencia: HechoEvidenciaRow[];
  documentos: ExpedienteDocument[];
  reconsideraciones: ReconsideracionRecord[];
  seguimientos: SeguimientoRecord[];
}

export interface ExpedienteHistoryFilters {
  search?: string;
  type?: string;
  participant?: string;
  responsible?: string;
  milestoneId?: string;
  hechoId?: string;
  document?: boolean;
  status?: ExpedienteHistoryEntry["status"];
  origin?: ExpedienteHistoryEntry["origin"];
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchExpedienteCompleto(
  causaId: string,
  tenantId?: string | null,
): Promise<ExpedienteCompleto> {
  const causa = await fetchCausaDetails(causaId, tenantId);
  const [
    actuaciones,
    avances,
    hechos,
    vinculosHechoEvidencia,
    documentos,
    reconsideraciones,
    seguimientoRows,
  ] = await Promise.all([
    fetchExpedienteEvents(causa.id, causa.incidenteId),
    fetchChecklistProgress(causa.id, causa.incidenteId),
    fetchHechos(causa.id),
    fetchHechoEvidencias(causa.id),
    fetchExpedienteDocuments(causa.id, causa.incidenteId),
    fetchReconsideraciones(causa.id),
    fetchSeguimiento(causa.id),
  ]);

  const seguimientos = seguimientoRows.map((row) => ({
    id: row.id,
    estado: row.estado,
    fecha: row.fecha_inicio,
    descripcion: row.descripcion,
    titulo: row.titulo,
    responsable: row.responsable,
    fechaFin: row.fecha_fin,
    cumplimiento: row.cumplimiento,
    evaluacion: row.evaluacion,
  }));

  return {
    causa,
    hitos: causa.checklistDebidoProceso,
    actuaciones,
    avances,
    hechos,
    vinculosHechoEvidencia,
    documentos,
    reconsideraciones,
    seguimientos,
  };
}

function documentNamesFor(
  entry: Pick<ExpedienteHistoryEntry, "milestoneId" | "hechoId"> & {
    eventId?: string;
  },
  documentos: ExpedienteDocument[],
): string[] {
  return documentos
    .filter(
      (document) =>
        (entry.eventId && document.event_id === entry.eventId) ||
        (entry.hechoId && document.hecho_id === entry.hechoId) ||
        (entry.milestoneId && document.milestone_id === entry.milestoneId),
    )
    .map((document) => document.display_name || document.original_name);
}

function documentPathsFor(
  entry: Pick<ExpedienteHistoryEntry, "milestoneId" | "hechoId"> & {
    eventId?: string;
  },
  documentos: ExpedienteDocument[],
): string[] {
  return documentos
    .filter(
      (document) =>
        (entry.eventId && document.event_id === entry.eventId) ||
        (entry.hechoId && document.hecho_id === entry.hechoId) ||
        (entry.milestoneId && document.milestone_id === entry.milestoneId),
    )
    .map((document) => document.storage_path);
}

export function buildExpedienteHistory(
  expediente: ExpedienteCompleto,
): ExpedienteHistoryEntry[] {
  const { causa, actuaciones, avances, documentos } = expediente;
  const representedSources = new Set(
    actuaciones.flatMap((event) =>
      event.source_table && event.source_id
        ? [`${event.source_table}:${event.source_id}`]
        : [],
    ),
  );
  const entries: ExpedienteHistoryEntry[] = actuaciones.map((event) => ({
    id: `event:${event.id}`,
    occurredAt: event.occurred_at,
    recordedAt: event.recorded_at,
    type: event.event_type,
    title: event.title,
    description: event.description,
    responsible: event.recorded_by,
    participants: event.participants,
    milestoneId: event.milestone_id,
    hechoId: event.hecho_id,
    documentNames: documentNamesFor(
      {
        eventId: event.id,
        milestoneId: event.milestone_id,
        hechoId: event.hecho_id,
      },
      documentos,
    ),
    documentPaths: documentPathsFor(
      {
        eventId: event.id,
        milestoneId: event.milestone_id,
        hechoId: event.hecho_id,
      },
      documentos,
    ),
    status: event.status,
    origin: event.causa_id === causa.id ? "individual" : "grupal",
    source: "event",
    correctionReason: event.correction_reason,
  }));

  for (const entry of causa.bitacora) {
    if (representedSources.has(`bitacora_entries:${entry.id}`)) continue;
    entries.push({
      id: `bitacora:${entry.id}`,
      occurredAt: entry.fecha,
      recordedAt: null,
      type: entry.tipo,
      title: entry.titulo,
      description: entry.descripcion,
      responsible: null,
      participants: entry.participantes,
      milestoneId: null,
      hechoId: null,
      documentNames: entry.documentoAdjunto ? [entry.documentoAdjunto] : [],
      documentPaths: entry.documentoAdjunto ? [entry.documentoAdjunto] : [],
      status: "vigente",
      origin: entry.compartidoGrupal ? "grupal" : "individual",
      source: "bitacora",
      correctionReason: null,
    });
  }

  for (const progress of avances) {
    if (representedSources.has(`checklist_progress_entries:${progress.id}`))
      continue;
    entries.push({
      id: `avance:${progress.id}`,
      occurredAt: progress.occurredAt,
      recordedAt: progress.createdAt,
      type: progress.entryType,
      title: progress.title,
      description: progress.description,
      responsible: progress.createdBy ?? null,
      participants: [],
      milestoneId: progress.checklistItemId,
      hechoId: null,
      documentNames: progress.documentName
        ? [progress.documentName]
        : documentNamesFor(
            { milestoneId: progress.checklistItemId, hechoId: null },
            documentos,
          ),
      documentPaths: progress.documentUrl
        ? [progress.documentUrl]
        : documentPathsFor(
            { milestoneId: progress.checklistItemId, hechoId: null },
            documentos,
          ),
      status: progress.invalidatedAt ? "invalidado" : "vigente",
      origin: progress.incidenteId ? "grupal" : "individual",
      source: "avance",
      correctionReason: progress.invalidationReason ?? null,
    });
  }

  for (const record of expediente.reconsideraciones) {
    entries.push({
      id: `reconsideracion:${record.id}`,
      occurredAt: record.solicitadaAt,
      recordedAt: record.resueltaAt,
      type: record.tipo,
      title: record.tipo === "apelacion" ? "Apelación" : "Reconsideración",
      description: record.solicitud,
      responsible: record.solicitadaPor,
      participants: [],
      milestoneId: "chk_imp_3",
      hechoId: null,
      documentNames: record.documentoNombre ? [record.documentoNombre] : [],
      documentPaths: [],
      status: record.estado === "pendiente" ? "vigente" : "rectificado",
      origin: "individual",
      source: "reconsideracion",
      correctionReason: record.resolucion || null,
    });
  }

  for (const record of expediente.seguimientos) {
    entries.push({
      id: `seguimiento:${record.id}`,
      occurredAt: record.fecha ?? new Date().toISOString(),
      recordedAt: null,
      type: "Seguimiento",
      title: record.titulo,
      description: record.descripcion,
      responsible: record.responsable || null,
      participants: [],
      milestoneId: "chk_seg_1",
      hechoId: null,
      documentNames: [],
      documentPaths: [],
      status: record.estado === "incumplido" ? "invalidado" : "vigente",
      origin: "individual",
      source: "seguimiento",
      correctionReason: record.evaluacion || null,
    });
  }

  return entries.sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() -
      new Date(left.occurredAt).getTime(),
  );
}

export function filterExpedienteHistory(
  entries: ExpedienteHistoryEntry[],
  filters: ExpedienteHistoryFilters,
): ExpedienteHistoryEntry[] {
  const search = filters.search?.trim().toLocaleLowerCase("es-CL");
  return entries.filter((entry) => {
    if (filters.type && entry.type !== filters.type) return false;
    if (filters.status && entry.status !== filters.status) return false;
    if (filters.origin && entry.origin !== filters.origin) return false;
    if (filters.milestoneId && entry.milestoneId !== filters.milestoneId)
      return false;
    if (filters.hechoId && entry.hechoId !== filters.hechoId) return false;
    if (
      filters.document !== undefined &&
      entry.documentNames.length > 0 !== filters.document
    )
      return false;
    if (
      filters.participant &&
      !entry.participants.includes(filters.participant)
    )
      return false;
    if (filters.responsible && entry.responsible !== filters.responsible)
      return false;
    const occurredDate = toDateOnly(new Date(entry.occurredAt));
    if (filters.dateFrom && occurredDate < filters.dateFrom) return false;
    if (filters.dateTo && occurredDate > filters.dateTo) return false;
    if (!search) return true;
    return [
      entry.type,
      entry.title,
      entry.description,
      entry.responsible ?? "",
      entry.participants.join(" "),
      entry.milestoneId ?? "",
      entry.hechoId ?? "",
      entry.documentNames.join(" "),
    ].some((value) => value.toLocaleLowerCase("es-CL").includes(search));
  });
}
