/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useState } from 'react';
import type { CartaDisciplinaria } from '@/src/shared/lib/types';
import {
  fetchStudentDisciplinarySnapshot,
  type StudentDisciplinarySnapshot,
} from '@/src/services/cartas.service';

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
  counts: { negativas: 0, positivas: 0, informativas: 0 },
  lastAnalysis: null,
};

interface DisciplinaryDataResult extends StudentDisciplinarySnapshot {
  isDataLoading: boolean;
  refresh: () => Promise<void>;
  cartas: CartaDisciplinaria[];
}

export function useDisciplinaryData(studentId: string): DisciplinaryDataResult {
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<StudentDisciplinarySnapshot>(EMPTY_SNAPSHOT);

  const refresh = useCallback(async () => {
    if (!studentId) return;
    setIsDataLoading(true);
    try {
      setSnapshot(await fetchStudentDisciplinarySnapshot(studentId));
    } catch (error) {
      console.error('Error loading disciplinary snapshot:', error);
      setSnapshot(EMPTY_SNAPSHOT);
    } finally {
      setIsDataLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!studentId) return;
      setIsDataLoading(true);
      try {
        const nextSnapshot = await fetchStudentDisciplinarySnapshot(studentId);
        if (!cancelled) setSnapshot(nextSnapshot);
      } catch (error) {
        console.error('Error loading disciplinary snapshot:', error);
        if (!cancelled) setSnapshot(EMPTY_SNAPSHOT);
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return { isDataLoading, refresh, ...snapshot };
}