/** @license SPDX-License-Identifier: Apache-2.0 */

import { useQuery } from '@tanstack/react-query';
import { fetchCourses } from '../../api/services/courses.service';
import { useAuthStore } from '../stores/authStore';

export function useCoursesQuery(enabled?: boolean) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);
  const canFetch = enabled ?? isAuthenticated;

  return useQuery({
    queryKey: ['courses', tenantId],
    queryFn: fetchCourses,
    enabled: canFetch && Boolean(tenantId),
    staleTime: 1000 * 60 * 30,
  });
}
