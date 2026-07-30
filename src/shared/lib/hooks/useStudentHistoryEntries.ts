/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStudentHistoryEntry,
  fetchStudentHistoryEntries,
} from '../../api/services/student-history.service';
import type { StudentHistoryEntryInput } from '../schemas/studentHistoryEntry';

function getQueryKey(studentId: string) {
  return ['student-history-entries', studentId] as const;
}

export function useStudentHistoryEntries(studentId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: getQueryKey(studentId),
    queryFn: () => fetchStudentHistoryEntries(studentId),
    enabled: Boolean(studentId),
  });
  const createMutation = useMutation({
    mutationFn: (input: StudentHistoryEntryInput) => createStudentHistoryEntry(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getQueryKey(studentId) });
    },
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    loadError: query.error instanceof Error ? query.error.message : null,
    createEntry: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error instanceof Error ? createMutation.error.message : null,
    resetCreateError: createMutation.reset,
  };
}
