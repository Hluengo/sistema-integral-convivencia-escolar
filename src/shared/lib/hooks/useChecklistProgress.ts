/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChecklistProgress,
  fetchChecklistProgress,
  invalidateChecklistProgress,
  type CreateChecklistProgressInput,
} from '../../api/services/checklistProgress.service';

export function useChecklistProgress(causaId: string, incidenteId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['checklist-progress', causaId, incidenteId ?? null] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => fetchChecklistProgress(causaId, incidenteId),
    enabled: Boolean(causaId),
    staleTime: 30_000,
  });
  const createMutation = useMutation({
    mutationFn: (input: CreateChecklistProgressInput) => createChecklistProgress(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checklist-progress', causaId] });
      if (incidenteId) {
        void queryClient.invalidateQueries({ queryKey: ['incidente', incidenteId] });
      }
    },
  });
  const invalidateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      invalidateChecklistProgress(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    entries: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createEntry: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    invalidateEntry: invalidateMutation.mutateAsync,
    isInvalidating: invalidateMutation.isPending,
  };
}
