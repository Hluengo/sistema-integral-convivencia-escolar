/** @license SPDX-License-Identifier: Apache-2.0 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  fetchStudentsByCourse,
  fetchStudentsWithCourses,
  fetchStudentsWithCoursesPage,
  fetchStudentActivityHistoryPage,
} from '../../api/services/courses.service';
import { useAuthStore } from '../stores/authStore';

export function useStudentsQuery(courseId: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);
  return useQuery({
    queryKey: ['students', tenantId, courseId],
    queryFn: () => fetchStudentsByCourse(courseId),
    enabled: isAuthenticated && Boolean(tenantId && courseId),
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

export function usePaginatedStudentsWithCoursesQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);

  return useInfiniteQuery({
    queryKey: ['students-with-courses-paginated', tenantId],
    queryFn: ({ pageParam }) => fetchStudentsWithCoursesPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.students.length, 0);
      return loaded < lastPage.totalCount ? loaded : undefined;
    },
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: 1000 * 60 * 10,
  });
}

export function usePaginatedStudentActivityHistoryQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);

  return useInfiniteQuery({
    queryKey: ['student-activity-history', tenantId],
    queryFn: ({ pageParam }) => fetchStudentActivityHistoryPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.students.length, 0);
      return loaded < lastPage.totalCount ? loaded : undefined;
    },
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: 1000 * 60 * 5,
  });
}
