/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

export type ReportType = 'expedientes' | 'anotaciones' | 'uso' | 'auditoria';
type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ReportFilters {
  course: string;
  fromDate: string;
  toDate: string;
  status: string;
  responsible: string;
}

export interface ReportHistoryItem {
  id: string;
  created_by: string;
  report_type: ReportType;
  status: ReportStatus;
  filters: ReportFilters;
  row_count: number;
  file_name: string | null;
  created_at: string;
  completed_at: string | null;
}

const EMPTY_FILTERS: ReportFilters = {
  course: '',
  fromDate: '',
  toDate: '',
  status: '',
  responsible: '',
};

export async function fetchReportHistory(): Promise<ReportHistoryItem[]> {
  const { data, error } = await supabase
    .from('report_history')
    .select('id,created_by,report_type,status,filters,row_count,file_name,created_at,completed_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((item) => ({
    ...item,
    filters: { ...EMPTY_FILTERS, ...(item.filters as Partial<ReportFilters>) },
  })) as ReportHistoryItem[];
}

export async function createReportHistory(input: {
  reportType: ReportType;
  filters: ReportFilters;
  rowCount: number;
  fileName: string;
}): Promise<void> {
  const { error } = await supabase.from('report_history').insert({
    report_type: input.reportType,
    filters: input.filters,
    row_count: input.rowCount,
    file_name: input.fileName,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  if (error) throw error;
}
