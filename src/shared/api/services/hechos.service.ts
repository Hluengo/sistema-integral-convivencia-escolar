/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from "../lib/supabase";

export type HechoEstado =
  "denunciado" | "acreditado" | "parcial" | "no_acreditado";

export interface HechoRow {
  id: string;
  tenant_id: string;
  causa_id: string;
  incidente_id: string | null;
  titulo: string;
  descripcion: string;
  estado: HechoEstado;
  participacion_acreditada: boolean;
  rice_articulo: string | null;
  agravantes: string[];
  atenuantes: string[];
  medida_seleccionada: string | null;
  analisis_proporcionalidad: string;
  decision_fundada: string;
  created_at: string;
  updated_at: string;
}

export interface HechoEvidenciaRow {
  id: string;
  tenant_id: string;
  hecho_id: string;
  causa_id: string;
  evidencia_path: string;
  evidencia_nombre: string;
  created_at: string;
}

export async function fetchHechos(causaId: string): Promise<HechoRow[]> {
  const { data, error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("hechos")
    // @ts-expect-error tablas nuevas aún no tipadas
    .select("*")
    .eq("causa_id", causaId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchHechos error", error);
    return [];
  }
  return (data as HechoRow[]) ?? [];
}

export async function fetchHechoEvidencias(
  causaId: string,
): Promise<HechoEvidenciaRow[]> {
  const { data, error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("hecho_evidencias")
    // @ts-expect-error tablas nuevas aún no tipadas
    .select("*")
    .eq("causa_id", causaId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchHechoEvidencias error", error);
    return [];
  }
  return (data as HechoEvidenciaRow[]) ?? [];
}

export async function createHecho(params: {
  causaId: string;
  incidenteId?: string | null;
  titulo: string;
  descripcion?: string;
  riceArticulo?: string | null;
}): Promise<HechoRow | null> {
  const payload = {
    causa_id: params.causaId,
    incidente_id: params.incidenteId ?? null,
    titulo: params.titulo.trim(),
    descripcion: (params.descripcion ?? "").trim(),
    estado: "denunciado" as HechoEstado,
    participacion_acreditada: false,
    rice_articulo: params.riceArticulo?.trim() || null,
  };
  const { data, error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("hechos")
    // @ts-expect-error tablas nuevas
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("createHecho error", error);
    return null;
  }
  return data as HechoRow;
}

export async function updateHecho(
  id: string,
  patch: Partial<
    Pick<
      HechoRow,
      | "titulo"
      | "descripcion"
      | "estado"
      | "participacion_acreditada"
      | "rice_articulo"
      | "agravantes"
      | "atenuantes"
      | "medida_seleccionada"
      | "analisis_proporcionalidad"
      | "decision_fundada"
    >
  >,
): Promise<boolean> {
  const { error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("hechos")
    // @ts-expect-error tablas nuevas
    .update(patch as never)
    .eq("id", id);
  if (error) {
    console.error("updateHecho error", error);
    return false;
  }
  return true;
}

export async function deleteHecho(id: string): Promise<boolean> {
  const { error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("hechos")
    // @ts-expect-error tablas nuevas
    .delete()
    .eq("id", id);
  if (error) {
    console.error("deleteHecho error", error);
    return false;
  }
  return true;
}

export async function linkEvidencia(params: {
  hechoId: string;
  causaId: string;
  evidenciaPath: string;
  evidenciaNombre?: string;
}): Promise<HechoEvidenciaRow | null> {
  const { data, error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("hecho_evidencias")
    // @ts-expect-error tablas nuevas
    .insert({
      hecho_id: params.hechoId,
      causa_id: params.causaId,
      evidencia_path: params.evidenciaPath,
      evidencia_nombre:
        params.evidenciaNombre ?? params.evidenciaPath.split("/").pop() ?? "",
    })
    .select()
    .single();
  if (error) {
    console.error("linkEvidencia error", error);
    return null;
  }
  return data as HechoEvidenciaRow;
}

export async function unlinkEvidencia(id: string): Promise<boolean> {
  const { error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("hecho_evidencias")
    // @ts-expect-error tablas nuevas
    .delete()
    .eq("id", id);
  if (error) {
    console.error("unlinkEvidencia error", error);
    return false;
  }
  return true;
}
