/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchStudentsByCourse,
  fetchStudentActivityHistoryPage,
} from "../../api/services/courses.service";
import { useAuthStore } from "../stores/authStore";

export function useStudentsQuery(courseId: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);
  return useQuery({
    queryKey: ["students", tenantId, courseId],
    queryFn: () => fetchStudentsByCourse(courseId),
    enabled: isAuthenticated && Boolean(tenantId && courseId),
    staleTime: 1000 * 60 * 10,
  });
}

interface StudentPageAutoLoad {
  loadAllPages: boolean;
  enabled: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
}

/**
 * El buscador y el filtro de curso del panel son locales: si falta alguna
 * página, un estudiante con actividad queda fuera de la búsqueda.
 */
export function shouldLoadNextStudentPage(state: StudentPageAutoLoad): boolean {
  return (
    state.loadAllPages &&
    state.enabled &&
    state.hasNextPage &&
    !state.isFetchingNextPage &&
    !state.isFetchNextPageError
  );
}

export function usePaginatedStudentActivityHistoryQuery(loadAllPages = false) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);
  const enabled = isAuthenticated && Boolean(tenantId);

  const query = useInfiniteQuery({
    queryKey: ["student-activity-history", tenantId],
    queryFn: ({ pageParam }) => fetchStudentActivityHistoryPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (total, page) => total + page.students.length,
        0,
      );
      return loaded < lastPage.totalCount ? loaded : undefined;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });

  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = query;

  useEffect(() => {
    if (
      shouldLoadNextStudentPage({
        loadAllPages,
        enabled,
        hasNextPage,
        isFetchingNextPage,
        isFetchNextPageError,
      })
    ) {
      void fetchNextPage();
    }
  }, [
    enabled,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    loadAllPages,
  ]);

  return query;
}
