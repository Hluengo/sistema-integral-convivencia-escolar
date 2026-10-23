/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { z } from "zod";
import type { Annotation } from "@/shared/lib/types";
import { useSessionDraftKey } from "@/shared/lib/hooks/useSessionDraftKey";
import { readSessionDraft, writeSessionDraft } from "@/shared/lib/sessionDraft";

const selectionSchema = z.object({ ids: z.array(z.string()) });

export function useSelectedAnnotations(
  annotations: Annotation[],
  recordId: string,
  enabled = true,
) {
  const scopedKey = useSessionDraftKey("letter-selection", recordId);
  const draftKey = enabled ? scopedKey : null;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () =>
      new Set(
        readSessionDraft(
          draftKey,
          {
            ids: annotations
              .filter((a) => a.type === "Negativa")
              .map((a) => a.id),
          },
          selectionSchema,
        ).ids,
      ),
  );
  useEffect(() => {
    writeSessionDraft(draftKey, { ids: [...selectedIds] });
  }, [draftKey, selectedIds]);

  const selectedAnnsObjects = useMemo(
    () => annotations.filter((a) => selectedIds.has(a.id)),
    [annotations, selectedIds],
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
      if (a.type === "Negativa") acc.add(a.id);
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
