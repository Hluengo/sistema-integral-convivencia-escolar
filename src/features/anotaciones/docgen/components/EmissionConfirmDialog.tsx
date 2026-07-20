/** @license SPDX-License-Identifier: Apache-2.0 */

import { CheckCircle2, X } from 'lucide-react';

interface EmissionConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EmissionConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: EmissionConfirmDialogProps) {
  if (!isOpen) { return null; }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-xs">
      <div className="flex items-center gap-2 text-amber-800 text-sm">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-600" />
        <span>Documento exportado correctamente. \u00bfMarcar como emitido en el historial?</span>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white text-xs transition-colors hover:bg-amber-700"
        >
          S\u00ed, marcar como emitida
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-white px-3 py-1.5 font-medium text-neutral-600 text-xs transition-colors hover:bg-neutral-100"
        >
          No
        </button>
      </div>
    </div>
  );
}