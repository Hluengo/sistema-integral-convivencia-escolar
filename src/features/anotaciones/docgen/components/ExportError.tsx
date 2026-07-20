/** @license SPDX-License-Identifier: Apache-2.0 */

import { AlertTriangle, X } from 'lucide-react';

interface ExportErrorProps {
  message: string | null;
  onClose: () => void;
}

export default function ExportError({ message, onClose }: ExportErrorProps) {
  if (!message) { return null; }
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar mensaje de error" className="shrink-0 text-red-400 hover:text-red-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}