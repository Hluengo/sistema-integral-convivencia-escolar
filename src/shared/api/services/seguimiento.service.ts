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
