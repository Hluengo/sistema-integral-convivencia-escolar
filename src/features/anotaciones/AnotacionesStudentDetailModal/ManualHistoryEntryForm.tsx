/** @license SPDX-License-Identifier: Apache-2.0 */

import HistoryEntryForm from '@/src/shared/ui/HistoryEntryForm';

interface ManualHistoryEntryFormProps {
  studentId: string;
  isSaving: boolean;
  error: string | null;
  onSave: (input: { studentId: string; title: string; description: string }) => Promise<unknown>;
  onResetError: () => void;
}

export default function ManualHistoryEntryForm({
  studentId,
  isSaving,
  error,
  onSave,
  onResetError,
}: ManualHistoryEntryFormProps) {
  return (
    <HistoryEntryForm
      idPrefix="manual-history"
      isSaving={isSaving}
      error={error}
      helperText="No modifica anotaciones, cartas ni etapas disciplinarias."
      onSave={({ title, description }) => onSave({ studentId, title, description })}
      onResetError={onResetError}
    />
  );
}
