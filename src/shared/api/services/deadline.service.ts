/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

export interface DashboardDeadlineKpis {
  overdueCount: number;
  dueTodayCount: number;
  dueSoonCount: number;
  criticalCount: number;
  asOf: string | null;
}

export async function fetchDashboardDeadlineKpis(): Promise<DashboardDeadlineKpis> {
  const { data, error } = await supabase.rpc('get_dashboard_deadline_kpis');
  if (error) throw error;
  const row = data?.[0];
  return {
    overdueCount: Number(row?.overdue_count) || 0,
    dueTodayCount: Number(row?.due_today_count) || 0,
    dueSoonCount: Number(row?.due_soon_count) || 0,
    criticalCount: Number(row?.critical_count) || 0,
    asOf: row?.as_of ?? null,
  };
}
