/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const DASHBOARD_ANNOTATION_QUERY_KEYS = [
  'annotation-stage-kpis',
  'course-carta-ranking',
  'teacher-annotation-ranking',
  'student-annotation-ranking',
] as const;

/**
 * Invalidates the dashboard annotation KPIs and rankings after any write that
 * mutates annotations or disciplinary letters (PDF confirmation, physical
 * carta registration, annotation edits). Without this, the dashboard would
 * only refresh on remount.
 */
export function useInvalidateDashboardQueries() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await Promise.all(
      DASHBOARD_ANNOTATION_QUERY_KEYS.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey: [queryKey] }),
      ),
    );
  }, [queryClient]);
}
