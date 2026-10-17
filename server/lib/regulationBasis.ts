/** @license SPDX-License-Identifier: Apache-2.0 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Nombre genérico mientras el colegio no publica su reglamento. */
export const FALLBACK_REGULATION_BASIS =
  "Reglamento Interno de Convivencia Escolar (RICE)";

/**
 * Base legal configurable por colegio: título + versión de su reglamento
 * vigente. El servidor corre sin RLS de usuario, así que filtra por tenant.
 */
export async function fetchActiveRegulationBasis(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<string> {
  const { data } = await supabase
    .from("institution_rule_versions")
    .select("title,version")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { title?: string | null; version?: string | null } | null;
  const title = row?.title?.trim();
  if (!title) return FALLBACK_REGULATION_BASIS;
  const version = row?.version?.trim();
  return version ? `${title} ${version}` : title;
}
