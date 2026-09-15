/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from "../lib/supabase";

export type SeguimientoEstado =
  "pendiente" | "en_curso" | "cumplido" | "incumplido" | "evaluado";

export interface SeguimientoRow {
  id: string;
  tenant_id: string;
  causa_id: string;
  incidente_id: string | null;
  titulo: string;
  descripcion: string;
  responsable: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado: SeguimientoEstado;
  cumplimiento: string;
  evaluacion: string;
  created_at: string;
  updated_at: string;
}

export async function fetchSeguimiento(
  causaId: string,
): Promise<SeguimientoRow[]> {
  const { data, error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("seguimiento_planes")
    // @ts-expect-error tabla nueva
    .select("*")
    .eq("causa_id", causaId)
    .order("fecha_inicio", { ascending: true });
  if (error) {
    console.error("fetchSeguimiento error", error);
    return [];
  }
  return (data as SeguimientoRow[]) ?? [];
}

export async function createSeguimiento(params: {
  causaId: string;
  incidenteId?: string | null;
  titulo: string;
  descripcion?: string;
  responsable?: string;
  fechaFin?: string | null;
}): Promise<SeguimientoRow | null> {
  const payload = {
    causa_id: params.causaId,
    incidente_id: params.incidenteId ?? null,
    titulo: params.titulo.trim(),
    descripcion: (params.descripcion ?? "").trim(),
    responsable: (params.responsable ?? "").trim(),
    fecha_fin: params.fechaFin ?? null,
    estado: "pendiente" as SeguimientoEstado,
  };
  const { data, error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("seguimiento_planes")
    // @ts-expect-error tabla nueva
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("createSeguimiento error", error);
    return null;
  }
  return data as SeguimientoRow;
}

export async function updateSeguimiento(
  id: string,
  patch: Partial<
    Pick<
      SeguimientoRow,
      | "titulo"
      | "descripcion"
      | "responsable"
      | "fecha_fin"
      | "estado"
      | "cumplimiento"
      | "evaluacion"
    >
  >,
): Promise<boolean> {
  const { error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("seguimiento_planes")
    // @ts-expect-error tabla nueva
    .update(patch as never)
    .eq("id", id);
  if (error) {
    console.error("updateSeguimiento error", error);
    return false;
  }
  return true;
}

export async function deleteSeguimiento(id: string): Promise<boolean> {
  const { error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("seguimiento_planes")
    // @ts-expect-error tabla nueva
    .delete()
    .eq("id", id);
  if (error) {
    console.error("deleteSeguimiento error", error);
    return false;
  }
  return true;
}
