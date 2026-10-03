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
