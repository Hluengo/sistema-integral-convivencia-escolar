/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/stores/authStore";
import { readSessionDraft } from "@/shared/lib/sessionDraft";
import { useSessionDraftKey } from "@/shared/lib/hooks/useSessionDraftKey";
import { restoreDisciplinaryFile } from "@/shared/api/services/disciplinary-storage.service";
import {
  createPdfReviewDraft,
  pdfReviewDraftSchema,
} from "./disciplinaryDraft";

export function usePdfReviewDraft(
  form: "student-pdf-review" | "new-disciplinary-process",
  recordId?: string,
) {
  const tenantId = useAuthStore((state) => state.tenantId);
  const draftKey = useSessionDraftKey(form, recordId);
  const [draft] = useState(() =>
    readSessionDraft(draftKey, createPdfReviewDraft(), pdfReviewDraftSchema),
  );
  const fileQuery = useQuery({
    queryKey: [
      "pdf-draft-file",
      draftKey,
      draft.uploadedFile?.storagePath,
      draft.analysis?.file_hash,
    ],
    queryFn: () =>
      restoreDisciplinaryFile(
        draft.uploadedFile!,
        tenantId!,
        draft.analysis!.file_hash,
        draft.analysis!.analysis_id,
      ),
    enabled: Boolean(draftKey && draft.uploadedFile && draft.analysis),
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: "always",
  });
  return { draftKey, draft, fileQuery };
}
