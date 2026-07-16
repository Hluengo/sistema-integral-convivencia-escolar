import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Annotation } from '@/src/types';

interface SelectedAnnotation {
  id: string;
  observation: string;
  severity: string;
  type: string;
}

export function useSelectedAnnotations(annotations: Annotation[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedAnnsObjects = useMemo(
    () => annotations.filter((a) => selectedIds.has(a.id)),
    [annotations, selectedIds]
  );

  const toggleAnnotation = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllNegative = useCallback(() => {
    const negIds = annotations.filter((a) => a.type === 'Negativa').map((a) => a.id);
    setSelectedIds(new Set(negIds));
  }, [annotations]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    selectedAnnsObjects,
    toggleAnnotation,
    selectAllNegative,
    clearSelection,
    hasSelection: selectedIds.size > 0,
  };
}