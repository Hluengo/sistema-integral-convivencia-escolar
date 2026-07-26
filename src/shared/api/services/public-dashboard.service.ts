/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

export interface PublicDashboardKpis {
  totalCauses: number;
  activeCauses: number;
  investigationCauses: number;
  resolvedCauses: number;
  criticalAlerts: number;
  leveCount: number;
  graveCount: number;
  muyGraveCount: number;
  gravisimaCount: number;
  amonestacionCount: number;
  compromisoCount: number;
  derivacionCount: number;
}

interface PublicDashboardRpcRow {
  total_causes: number | string;
  active_causes: number | string;
  investigation_causes: number | string;
  resolved_causes: number | string;
  critical_alerts: number | string;
  leve_count: number | string;
  grave_count: number | string;
  muy_grave_count: number | string;
  gravisima_count: number | string;
  amonestacion_count: number | string;
  compromiso_count: number | string;
  derivacion_count: number | string;
}

const EMPTY_PUBLIC_KPIS: PublicDashboardKpis = {
  totalCauses: 0,
  activeCauses: 0,
  investigationCauses: 0,
  resolvedCauses: 0,
  criticalAlerts: 0,
  leveCount: 0,
  graveCount: 0,
  muyGraveCount: 0,
  gravisimaCount: 0,
  amonestacionCount: 0,
  compromisoCount: 0,
  derivacionCount: 0,
};

export async function fetchPublicDashboardKpis(): Promise<PublicDashboardKpis> {
  const { data, error } = await supabase.rpc('get_public_dashboard_kpis');
  if (error) throw error;

  const row = (data?.[0] ?? null) as PublicDashboardRpcRow | null;
  if (!row) return EMPTY_PUBLIC_KPIS;

  return {
    totalCauses: Number(row.total_causes) || 0,
    activeCauses: Number(row.active_causes) || 0,
    investigationCauses: Number(row.investigation_causes) || 0,
    resolvedCauses: Number(row.resolved_causes) || 0,
    criticalAlerts: Number(row.critical_alerts) || 0,
    leveCount: Number(row.leve_count) || 0,
    graveCount: Number(row.grave_count) || 0,
    muyGraveCount: Number(row.muy_grave_count) || 0,
    gravisimaCount: Number(row.gravisima_count) || 0,
    amonestacionCount: Number(row.amonestacion_count) || 0,
    compromisoCount: Number(row.compromiso_count) || 0,
    derivacionCount: Number(row.derivacion_count) || 0,
  };
}
