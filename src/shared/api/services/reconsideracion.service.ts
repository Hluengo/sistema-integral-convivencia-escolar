/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from "../lib/supabase";
import type {
  ReconsideracionEstado,
  ReconsideracionRecord,
  ReconsideracionTipo,
} from "../../lib/types";

interface ReconsideracionRow {
  id: string;
  tipo: ReconsideracionTipo;
  estado: ReconsideracionEstado;
  solicitada_at: string;
  resuelta_at: string | null;
  solicitada_por: string | null;
  solicitud: string;
  resolucion: string;
  documento_nombre: string | null;
}

type QueryResult = { data: unknown; error: { message: string } | null };
interface UntypedQuery extends PromiseLike<QueryResult> {
  select(columns: string): UntypedQuery;
  eq(column: string, value: unknown): UntypedQuery;
  order(column: string, options: { ascending: boolean }): UntypedQuery;
  insert(payload: Record<string, unknown>): UntypedQuery;
  single(): UntypedQuery;
}

const db = supabase as unknown as { from: (table: string) => UntypedQuery };
const COLUMNS =
  "id,tipo,estado,solicitada_at,resuelta_at,solicitada_por,solicitud,resolucion,documento_nombre";

function mapRow(row: ReconsideracionRow): ReconsideracionRecord {
  return {
    id: row.id,
    tipo: row.tipo,
    estado: row.estado,
    solicitadaAt: row.solicitada_at,
    resueltaAt: row.resuelta_at,
    solicitadaPor: row.solicitada_por,
    solicitud: row.solicitud,
    resolucion: row.resolucion,
    documentoNombre: row.documento_nombre,
  };
}

export async function fetchReconsideraciones(
  causaId: string,
): Promise<ReconsideracionRecord[]> {
  const { data, error } = await db
    .from("reconsideraciones")
    .select(COLUMNS)
    .eq("causa_id", causaId)
    .order("solicitada_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ReconsideracionRow[]).map(mapRow);
}

export async function createReconsideracion(input: {
  causaId: string;
  incidenteId?: string | null;
  tipo: ReconsideracionTipo;
  solicitud: string;
  solicitadaPor?: string | null;
  documentoNombre?: string | null;
  documentoUrl?: string | null;
}): Promise<ReconsideracionRecord> {
  const { data, error } = await db
    .from("reconsideraciones")
    .insert({
      causa_id: input.causaId,
      incidente_id: input.incidenteId ?? null,
      tipo: input.tipo,
      solicitud: input.solicitud.trim(),
      solicitada_por: input.solicitadaPor ?? null,
      documento_nombre: input.documentoNombre ?? null,
      documento_url: input.documentoUrl ?? null,
    })
    .select(COLUMNS)
    .single();
  if (error || !data)
    throw error || new Error("No fue posible registrar la reconsideración.");
  return mapRow(data as ReconsideracionRow);
}
