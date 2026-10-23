/** @license SPDX-License-Identifier: Apache-2.0 */

import { useSessionDraftKey } from "@/shared/lib/hooks/useSessionDraftKey";
import HistoryEntryForm from "@/shared/ui/HistoryEntryForm";

interface ManualHistoryEntryFormProps {
  studentId: string;
  isSaving: boolean;
  error: string | null;
  onSave: (input: {
    studentId: string;
    title: string;
    description: string;
  }) => Promise<unknown>;
  onResetError: () => void;
}

export default function ManualHistoryEntryForm({
  studentId,
  isSaving,
  error,
  onSave,
  onResetError,
}: ManualHistoryEntryFormProps) {
  const draftKey = useSessionDraftKey("student-history", studentId);
  return (
    <HistoryEntryForm
      idPrefix="manual-history"
      draftKey={draftKey}
      isSaving={isSaving}
      error={error}
      helperText="No modifica anotaciones, cartas ni etapas disciplinarias."
      onSave={async ({ title, description, actionDate, documentText }) => {
        await onSave({
          studentId,
          title,
          description: [
            description,
            actionDate && `Fecha de la acción: ${actionDate}`,
            documentText.trim() && `Texto de evidencia:\n${documentText}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        });
      }}
      onResetError={onResetError}
    />
  );
}
