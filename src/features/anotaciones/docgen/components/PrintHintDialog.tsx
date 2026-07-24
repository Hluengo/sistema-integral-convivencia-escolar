/** @license SPDX-License-Identifier: Apache-2.0 */

import { Printer, AlertTriangle, X } from 'lucide-react';

interface PrintHintDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PrintHintDialog({ isOpen, onConfirm, onCancel }: PrintHintDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Configurar impresion"
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 rounded-xl p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 flex items-center gap-2">
          <Printer className="h-5 w-5 text-neutral-600" />
          <h2 className="font-semibold text-base text-neutral-900">Configurar impresion</h2>
        </div>

        <div className="space-y-3 text-sm text-neutral-700">
          <p className="font-medium text-neutral-900">
            Antes de imprimir, verifique la configuracion de la impresora:
          </p>
          <ul className="space-y-2 rounded-xl bg-neutral-50 p-4">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <span>
                <strong>Papel:</strong> Oficio chileno / Folio (216 x 330 mm)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <span>
                <strong>Margenes:</strong> Ninguno (0 mm)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <span>
                <strong>Escala:</strong> 100%
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <span>
                <strong>Encabezados y pies de pagina:</strong> Desactivados
              </span>
            </li>
          </ul>

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-amber-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <span className="text-xs">
              No seleccione papel Legal (8.5 x 14 pulgadas) ni A4 (210 x 297 mm). El documento esta
              dimensionado para Oficio chileno de 216 x 330 mm.
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
