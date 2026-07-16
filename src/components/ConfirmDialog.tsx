/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Eliminar', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) { return null; }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button 
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        aria-label="Cancelar"
        onClick={onCancel} 
      />
      <div className="relative w-full max-w-sm animate-scale-in rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <h3 className="font-semibold text-base text-neutral-900">{title}</h3>
        </div>
        <p className="mb-6 ml-[52px] text-neutral-500 text-sm">{description}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="cursor-pointer rounded-xl bg-neutral-100 px-4 py-2 font-medium text-neutral-700 text-sm transition-colors hover:bg-neutral-200">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="cursor-pointer rounded-xl bg-red-500 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-red-600">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
