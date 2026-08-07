/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/src/lib/queryClient';
import type { CartaDisciplinaria } from '@/src/shared/lib/types';
import {
  fetchStudentDisciplinarySnapshot,
  type StudentDisciplinarySnapshot,
} from '@/src/shared/api/services/cartas.service';

const EMPTY_SNAPSHOT: StudentDisciplinarySnapshot = {
  annotations: [],
  cartas: [],
  currentCarta: null,
  documentAnalyses: [],
  etapas: [],
  processes: [],
  files: [],
  detectedAnnotations: [],
  letterOutputEvents: [],
  cartaEvents: [],
  counts: { negativas: 0, positivas: 0, informativas: 0 },
  lastAnalysis: null,
};

const SNAPSHOT_QUERY_KEY = 'disciplinary-snapshot';

interface DisciplinaryDataResult extends StudentDisciplinarySnapshot {
  isDataLoading: boolean;
  refresh: () => Promise<void>;
  cartas: CartaDisciplinaria[];
}

export function useDisciplinaryData(studentId: string): DisciplinaryDataResult {
  const query = useQuery({
    queryKey: [SNAPSHOT_QUERY_KEY, studentId],
    queryFn: () => fetchStudentDisciplinarySnapshot(studentId),
    enabled: Boolean(studentId),
    staleTime: 5 * 60 * 1000,
  });

  const refresh = useCallback(async () => {
    if (!studentId) return;
    await queryClient.refetchQueries({ queryKey: [SNAPSHOT_QUERY_KEY, studentId] });
  }, [studentId]);

  const snapshot = query.data ?? EMPTY_SNAPSHOT;

  return { isDataLoading: query.isPending, refresh, ...snapshot };
}
