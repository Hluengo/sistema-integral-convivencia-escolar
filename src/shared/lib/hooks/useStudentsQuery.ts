/** @license SPDX-License-Identifier: Apache-2.0 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchStudentsByCourse,
  fetchStudentsWithCourses,
} from '../../api/services/courses.service';
import { useAuthStore } from '../stores/authStore';

export function useStudentsQuery(courseId: string) {
  const tenantId = useAuthStore((state) => state.tenantId);
  return useQuery({
    queryKey: ['students', tenantId, courseId],
    queryFn: () => fetchStudentsByCourse(courseId),
    enabled: Boolean(tenantId && courseId),
    staleTime: 1000 * 60 * 10,
  });
}

export function useStudentsWithCoursesQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);

  return useQuery({
    queryKey: ['students-with-courses', tenantId],
    queryFn: fetchStudentsWithCourses,
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: 1000 * 60 * 10,
  });
}
