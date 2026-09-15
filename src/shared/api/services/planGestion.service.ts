/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from "../lib/supabase";

export type PlanGestionEstado =
  "pendiente" | "en_curso" | "cumplido" | "evaluado" | "atrasado";

export interface PlanGestionRow {
  id: string;
  tenant_id: string;
  ano: number;
  objetivo: string;
  accion: string;
  responsable: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  indicador: string;
  evidencia_nombre: string | null;
  evidencia_path: string | null;
  estado: PlanGestionEstado;
  created_at: string;
  updated_at: string;
}

export async function fetchPlanGestion(
  ano?: number,
): Promise<PlanGestionRow[]> {
  let q = (supabase as unknown as { from: (t: string) => never })
    .from("plan_gestion")
    // @ts-expect-error tabla nueva
    .select("*")
    .order("fecha_inicio", { ascending: true });
  if (ano) q = q.eq("ano", ano) as never;
  const { data, error } = await q;
  if (error) {
    console.error("fetchPlanGestion error", error);
    return [];
  }
  return (data as PlanGestionRow[]) ?? [];
}

export async function createPlanGestion(params: {
  ano: number;
  objetivo: string;
  accion: string;
  responsable?: string;
  fechaFin?: string | null;
  indicador?: string;
}): Promise<PlanGestionRow | null> {
  const payload = {
    ano: params.ano,
    objetivo: params.objetivo.trim(),
    accion: params.accion.trim(),
    responsable: (params.responsable ?? "").trim(),
    fecha_fin: params.fechaFin ?? null,
    indicador: (params.indicador ?? "").trim(),
    estado: "pendiente" as PlanGestionEstado,
  };
  const { data, error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("plan_gestion")
    // @ts-expect-error tabla nueva
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("createPlanGestion error", error);
    return null;
  }
  return data as PlanGestionRow;
}

export async function updatePlanGestion(
  id: string,
  patch: Partial<
    Pick<
      PlanGestionRow,
      | "objetivo"
      | "accion"
      | "responsable"
      | "fecha_fin"
      | "indicador"
      | "estado"
      | "evidencia_path"
      | "evidencia_nombre"
    >
  >,
): Promise<boolean> {
  const { error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("plan_gestion")
    // @ts-expect-error tabla nueva
    .update(patch as never)
    .eq("id", id);
  if (error) {
    console.error("updatePlanGestion error", error);
    return false;
  }
  return true;
}

export async function deletePlanGestion(id: string): Promise<boolean> {
  const { error } = await (
    supabase as unknown as { from: (t: string) => never }
  )
    .from("plan_gestion")
    // @ts-expect-error tabla nueva
    .delete()
    .eq("id", id);
  if (error) {
    console.error("deletePlanGestion error", error);
    return false;
  }
  return true;
}
