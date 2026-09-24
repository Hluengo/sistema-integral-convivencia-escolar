/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Json } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import type { ExpedienteEvent } from "../../lib/types";

const EVENT_COLUMNS =
  "id,tenant_id,causa_id,incidente_id,occurred_at,recorded_at,recorded_by,event_type,title,description,milestone_id,hecho_id,source_table,source_id,participants,status,previous_event_id,correction_reason,metadata";

type QueryResult = { data: unknown; error: { message: string } | null };
interface UntypedQuery extends PromiseLike<QueryResult> {
  select(columns: string): UntypedQuery;
  eq(column: string, value: unknown): UntypedQuery;
  order(column: string, options: { ascending: boolean }): UntypedQuery;
  insert(payload: unknown): UntypedQuery;
  single(): UntypedQuery;
}

const db = supabase as unknown as { from: (table: string) => UntypedQuery };

export interface CreateExpedienteEventInput {
  causaId: string;
  incidenteId?: string | null;
  occurredAt: string;
  eventType: string;
  title: string;
  description?: string;
  milestoneId?: string | null;
  hechoId?: string | null;
  sourceTable?: string | null;
  sourceId?: string | null;
  participants?: string[];
  metadata?: Record<string, unknown>;
}

export function buildExpedienteEventPayload(
  input: CreateExpedienteEventInput,
  correction?: {
    previousEventId: string;
    status: "rectificado" | "invalidado";
    reason: string;
  },
): Record<string, unknown> {
  return {
    causa_id: input.causaId,
    incidente_id: input.incidenteId ?? null,
    occurred_at: input.occurredAt,
    event_type: input.eventType.trim(),
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    milestone_id: input.milestoneId ?? null,
    hecho_id: input.hechoId ?? null,
    source_table: input.sourceTable ?? null,
    source_id: input.sourceId ?? null,
    participants: input.participants ?? [],
    metadata: input.metadata ?? {},
    ...(correction
      ? {
          previous_event_id: correction.previousEventId,
          status: correction.status,
          correction_reason: correction.reason.trim(),
        }
      : {}),
  };
}

export async function fetchExpedienteEvents(
  causaId: string,
  incidenteId?: string,
): Promise<ExpedienteEvent[]> {
  const queries = [
    db
      .from("expediente_events")
      .select(EVENT_COLUMNS)
      .eq("causa_id", causaId)
      .order("occurred_at", { ascending: true }),
  ];
  if (incidenteId) {
    queries.push(
      db
        .from("expediente_events")
        .select(EVENT_COLUMNS)
        .eq("incidente_id", incidenteId)
        .order("occurred_at", { ascending: true }),
    );
  }
  const results = await Promise.all(queries);
  const rows = results.flatMap(({ data, error }) => {
    if (error) throw error;
    return (data ?? []) as ExpedienteEvent[];
  });
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

export async function appendExpedienteEvent(
  input: CreateExpedienteEventInput,
): Promise<ExpedienteEvent> {
  const { data, error } = await db
    .from("expediente_events")
    .insert(buildExpedienteEventPayload(input) as unknown as Json)
    .select(EVENT_COLUMNS)
    .single();
  if (error || !data)
    throw error || new Error("No fue posible registrar la actuación.");
  return data as unknown as ExpedienteEvent;
}

export async function appendExpedienteEventCorrection(
  input: CreateExpedienteEventInput,
  correction: {
    previousEventId: string;
    status: "rectificado" | "invalidado";
    reason: string;
  },
): Promise<ExpedienteEvent> {
  const { data, error } = await db
    .from("expediente_events")
    .insert(buildExpedienteEventPayload(input, correction) as unknown as Json)
    .select(EVENT_COLUMNS)
    .single();
  if (error || !data)
    throw error || new Error("No fue posible registrar la rectificación.");
  return data as unknown as ExpedienteEvent;
}
