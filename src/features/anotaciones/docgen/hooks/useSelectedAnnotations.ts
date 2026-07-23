import { useState, useCallback, useMemo } from 'react';
import type { Annotation } from '@/src/types';
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
    const negIds = annotations.reduce<Set<string>>((acc, a) => {
      if (a.type === 'Negativa') acc.add(a.id);
      return acc;
    }, new Set());
    setSelectedIds(negIds);
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