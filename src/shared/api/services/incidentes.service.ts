/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from "../lib/supabase";
import type { Causa, Incidente } from "../../lib/types";
import { normalizeDocumentPath } from "./storage.service";
import { z } from "zod";
import { createDraftCausa } from "../../../lib/causaFactory";
import {
  groupIncidenteSchema,
  type CreateGroupIncidenteInput,
} from "../../lib/schemas/groupIncidente";

const INCIDENTE_COLUMNS =
  "id,tenant_id,fecha_hora,lugar,tipo,descripcion,responsable,created_at,updated_at";

const createdGroupSchema = z.object({
  incidente: z.object({
    id: z.uuid(),
    tenant_id: z.uuid(),
    fecha_hora: z.string(),
    lugar: z.string(),
    tipo: z.string(),
    descripcion: z.string(),
    responsable: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  causaIds: z.array(z.string().min(1)),
});

export interface IncidenteCausaSummary {
  id: string;
  estudianteNombre: string;
  nnaProtectedName: string;
  estudianteCurso: string;
  estadoActual: Causa["estadoActual"];
  tipoInfraccion: Causa["tipoInfraccion"];
  fechaUltimaActualizacion: string;
}

export interface IncidenteSharedActivity {
  id: string;
  kind: "avance" | "hito";
  sourceCausaId: string;
  title: string;
  description: string;
  entryType: string;
  occurredAt: string;
  documentName?: string;
  documentUrl?: string;
}

function mapIncidente(row: Record<string, unknown>): Incidente {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    fechaHora: String(row.fecha_hora),
    lugar: String(row.lugar ?? ""),
    tipo: String(row.tipo ?? ""),
    descripcion: String(row.descripcion ?? ""),
    responsable: String(row.responsable ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createIncidenteWithCausas(
  input: CreateGroupIncidenteInput,
  tenantId: string | null,
): Promise<{ incidente: Incidente; causaIds: string[] }> {
  if (!tenantId) throw new Error("No se pudo resolver el colegio activo.");
  const parsed = groupIncidenteSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const { requestId, ...request } = parsed.data;
  const draft = createDraftCausa({
    counter: 1,
    estudianteNombre: "",
    estudianteCurso: "",
    runEstudiante: "",
    tipoInfraccion: request.tipoInfraccion,
    comprometeAulaSegura: request.comprometeAulaSegura,
    observaciones: request.descripcion,
    responsable: request.responsable,
  });
  const { data, error } = await supabase.rpc("create_incidente_with_causas", {
    p_request_id: requestId,
    p_request: request,
    p_defaults: {
      fechaApertura: draft.fechaApertura,
      fechaInicioInvestigacion: draft.fechaInicioInvestigacion,
      plazoInvestigacionDias: draft.plazoInvestigacionDias,
      fechaLimiteInvestigacion: draft.fechaLimiteInvestigacion,
    },
    p_initial_checklist: draft.checklistDebidoProceso.map((item) => ({
      id: item.id,
      label: item.label,
      descripcion: item.descripcion,
      completado: false,
      requeridoPor: item.requeridoPor,
    })),
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883")
      throw new Error(
        "El alta grupal atómica todavía no está habilitada. Su borrador se conserva; no se intentará un alta parcial.",
      );
    if (error.code === "42501")
      throw new Error(
        "No tiene permiso para crear expedientes de Convivencia en este colegio.",
      );
    if (error.code === "22023") throw new Error(error.message);
    throw new Error(
      "No fue posible confirmar el incidente y todos sus expedientes. Su borrador y la solicitud se conservan para reintentar sin duplicarlos.",
    );
  }
  const result = createdGroupSchema.safeParse(data);
  if (
    !result.success ||
    result.data.incidente.tenant_id !== tenantId ||
    result.data.causaIds.length !== request.studentIds.length ||
    new Set(result.data.causaIds).size !== request.studentIds.length
  ) {
    throw new Error(
      "No fue posible comprobar la confirmación completa del grupo. Revise el historial o reintente con la misma solicitud.",
    );
  }
  return {
    incidente: mapIncidente(result.data.incidente),
    causaIds: result.data.causaIds,
  };
}

export async function fetchIncidente(
  incidenteId: string,
): Promise<Incidente | null> {
  const { data, error } = await supabase
    .from("incidentes")
    .select(INCIDENTE_COLUMNS)
    .eq("id", incidenteId)
    .maybeSingle();
  if (error) {
    console.error("Error fetching incidente:", error);
    return null;
  }
  return data ? mapIncidente(data as Record<string, unknown>) : null;
}

export async function fetchIncidenteCausas(
  incidenteId: string,
): Promise<IncidenteCausaSummary[]> {
  const { data, error } = await supabase
    .from("causas")
    .select(
      "id,estudiante_nombre,nna_protected_name,estudiante_curso,estado_actual,tipo_infraccion,fecha_ultima_actualizacion",
    )
    .eq("incidente_id", incidenteId)
    .order("fecha_ultima_actualizacion", { ascending: false });
  if (error) {
    console.error("Error fetching incidente causas:", error);
    return [];
  }
  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    estudianteNombre: String(row.estudiante_nombre ?? ""),
    nnaProtectedName: String(row.nna_protected_name ?? ""),
    estudianteCurso: String(row.estudiante_curso ?? ""),
    estadoActual: row.estado_actual as Causa["estadoActual"],
    tipoInfraccion: row.tipo_infraccion as Causa["tipoInfraccion"],
    fechaUltimaActualizacion: String(row.fecha_ultima_actualizacion ?? ""),
  }));
}

export async function fetchIncidenteSharedActivity(
  incidenteId: string,
  causas: IncidenteCausaSummary[],
): Promise<IncidenteSharedActivity[]> {
  const causaIds = causas.map((causa) => causa.id);
  if (causaIds.length === 0) return [];

  const [bitacoraResult, progressResult] = await Promise.all([
    supabase
      .from("bitacora_entries")
      .select("id,causa_id,fecha,tipo,titulo,descripcion,documento_adjunto")
      .in("causa_id", causaIds)
      .eq("compartido_grupal", true),
    supabase
      .from("checklist_progress_entries")
      .select(
        "id,causa_id,title,description,entry_type,occurred_at,document_name,document_url,incidente_id",
      )
      .in("causa_id", causaIds)
      .eq("incidente_id", incidenteId),
  ]);

  if (bitacoraResult.error)
    console.error("Error fetching shared milestones:", bitacoraResult.error);
  if (progressResult.error)
    console.error("Error fetching shared progress:", progressResult.error);

  const activities: IncidenteSharedActivity[] = [
    ...((bitacoraResult.data || []) as Array<Record<string, unknown>>).map(
      (row) => ({
        id: String(row.id),
        kind: "hito" as const,
        sourceCausaId: String(row.causa_id),
        title: String(row.titulo ?? ""),
        description: String(row.descripcion ?? ""),
        entryType: String(row.tipo ?? "Otro"),
        occurredAt: String(row.fecha),
        documentUrl: row.documento_adjunto
          ? normalizeDocumentPath(String(row.documento_adjunto)) || undefined
          : undefined,
      }),
    ),
    ...((progressResult.data || []) as Array<Record<string, unknown>>).map(
      (row) => ({
        id: String(row.id),
        kind: "avance" as const,
        sourceCausaId: String(row.causa_id),
        title: String(row.title ?? ""),
        description: String(row.description ?? ""),
        entryType: String(row.entry_type ?? "Otro"),
        occurredAt: String(row.occurred_at),
        documentName: row.document_name ? String(row.document_name) : undefined,
        documentUrl: row.document_url
          ? normalizeDocumentPath(String(row.document_url)) || undefined
          : undefined,
      }),
    ),
  ];

  return activities.sort(
    (first, second) =>
      new Date(second.occurredAt).getTime() -
      new Date(first.occurredAt).getTime(),
  );
}
