/** @license SPDX-License-Identifier: Apache-2.0 */

import { useQuery } from '@tanstack/react-query';
import { fetchCourses } from '../../../services/courses.service';
import { useAuthStore } from '../../../stores/authStore';

export function useCoursesQuery(enabled?: boolean) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const canFetch = enabled ?? isAuthenticated;

  return useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
    enabled: canFetch,
    staleTime: 1000 * 60 * 30,
  });
}
