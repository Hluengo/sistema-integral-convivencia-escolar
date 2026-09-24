/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Json } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import type {
  ExpedienteDocument,
  ExpedienteDocumentOrigin,
  ExpedienteDocumentScope,
} from "../../lib/types";

const DOCUMENT_COLUMNS =
  "id,tenant_id,causa_id,incidente_id,original_name,display_name,mime_type,byte_size,storage_path,milestone_id,event_id,hecho_id,document_date,incorporated_at,incorporated_by,origin,scope,version,status,invalidated_at,invalidated_by,invalidation_reason,sha256,metadata";

type QueryResult = { data: unknown; error: { message: string } | null };
interface UntypedQuery extends PromiseLike<QueryResult> {
  select(columns: string): UntypedQuery;
  eq(column: string, value: unknown): UntypedQuery;
  order(column: string, options: { ascending: boolean }): UntypedQuery;
  insert(payload: unknown): UntypedQuery;
  update(payload: unknown): UntypedQuery;
  single(): UntypedQuery;
}

const db = supabase as unknown as { from: (table: string) => UntypedQuery };

export interface RegisterExpedienteDocumentInput {
  causaId: string;
  incidenteId?: string | null;
  originalName: string;
  displayName?: string;
  mimeType?: string;
  byteSize?: number;
  storagePath: string;
  milestoneId?: string | null;
  eventId?: string | null;
  hechoId?: string | null;
  documentDate?: string | null;
  origin?: ExpedienteDocumentOrigin;
  scope?: ExpedienteDocumentScope;
  version?: number;
  sha256?: string | null;
  metadata?: Record<string, unknown>;
}

export function buildExpedienteDocumentPayload(
  input: RegisterExpedienteDocumentInput,
): Record<string, unknown> {
  if (!input.milestoneId && !input.eventId && !input.hechoId) {
    throw new Error(
      "El documento debe vincularse a un hito, actuación o hecho.",
    );
  }
  return {
    causa_id: input.causaId,
    incidente_id: input.incidenteId ?? null,
    original_name: input.originalName.trim(),
    display_name: (input.displayName ?? input.originalName).trim(),
    mime_type: input.mimeType ?? "application/octet-stream",
    byte_size: input.byteSize ?? 0,
    storage_path: input.storagePath,
    milestone_id: input.milestoneId ?? null,
    event_id: input.eventId ?? null,
    hecho_id: input.hechoId ?? null,
    document_date: input.documentDate ?? null,
    origin: input.origin ?? "interno",
    scope: input.scope ?? "individual",
    version: input.version ?? 1,
    sha256: input.sha256 ?? null,
    metadata: input.metadata ?? {},
  };
}

export async function fetchExpedienteDocuments(
  causaId: string,
  incidenteId?: string,
): Promise<ExpedienteDocument[]> {
  const queries = [
    db
      .from("expediente_documents")
      .select(DOCUMENT_COLUMNS)
      .eq("causa_id", causaId)
      .order("incorporated_at", { ascending: false }),
  ];
  if (incidenteId) {
    queries.push(
      db
        .from("expediente_documents")
        .select(DOCUMENT_COLUMNS)
        .eq("incidente_id", incidenteId)
        .order("incorporated_at", { ascending: false }),
    );
  }
  const results = await Promise.all(queries);
  const rows = results.flatMap(({ data, error }) => {
    if (error) throw error;
    return (data ?? []) as ExpedienteDocument[];
  });
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

export async function registerExpedienteDocument(
  input: RegisterExpedienteDocumentInput,
): Promise<ExpedienteDocument> {
  const { data, error } = await db
    .from("expediente_documents")
    .insert(buildExpedienteDocumentPayload(input) as unknown as Json)
    .select(DOCUMENT_COLUMNS)
    .single();
  if (error || !data)
    throw error || new Error("No fue posible indexar el documento.");
  return data as unknown as ExpedienteDocument;
}

export async function invalidateExpedienteDocument(
  id: string,
  reason: string,
): Promise<boolean> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user)
    throw authError || new Error("La sesión ya no está disponible.");

  const { error } = await db
    .from("expediente_documents")
    .update({
      status: "invalidado",
      invalidated_at: new Date().toISOString(),
      invalidated_by: authData.user.id,
      invalidation_reason: reason.trim(),
    })
    .eq("id", id)
    .eq("status", "vigente");
  if (error) throw error;
  return true;
}

export async function replaceExpedienteDocument(
  previousId: string,
  input: RegisterExpedienteDocumentInput,
): Promise<ExpedienteDocument> {
  const next = await registerExpedienteDocument({
    ...input,
    version: input.version ?? 1,
  });
  const { error } = await db
    .from("expediente_documents")
    .update({ status: "reemplazado" })
    .eq("id", previousId)
    .eq("status", "vigente");
  if (error) throw error;
  return next;
}
