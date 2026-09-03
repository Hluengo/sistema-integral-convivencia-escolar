/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryClient } from '../../../lib/queryClient';

const DASHBOARD_ANNOTATION_QUERY_KEYS = [
  'public-dashboard-kpis',
  'annotation-stage-kpis',
  'course-carta-ranking',
  'teacher-annotation-ranking',
  'student-annotation-ranking',
  'annual-annotation-trends',
  'causas',
  'dashboard-deadline-kpis',
] as const;

type DashboardQueryClient = Pick<typeof queryClient, 'invalidateQueries'>;

export async function invalidateDashboardQueries(client: DashboardQueryClient = queryClient) {
  await Promise.all(
    DASHBOARD_ANNOTATION_QUERY_KEYS.map((queryKey) =>
      client.invalidateQueries({ queryKey: [queryKey] }),
    ),
  );
}

/**
 * Invalidates the dashboard annotation KPIs and rankings after any write that
 * mutates annotations or disciplinary letters (PDF confirmation, physical
 * carta registration, annotation edits). Without this, the dashboard would
 * only refresh on remount.
 */
export function useInvalidateDashboardQueries() {
  const queryClient = useQueryClient();

  return useCallback(() => invalidateDashboardQueries(queryClient), [queryClient]);
}
