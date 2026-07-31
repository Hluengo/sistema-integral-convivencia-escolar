/** @license SPDX-License-Identifier: Apache-2.0 */

import { Printer, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/shared/ui/Dialog';
import Button from '@/src/shared/ui/Button';

interface PrintHintDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PrintHintDialog({ isOpen, onConfirm, onCancel }: PrintHintDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="block">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-neutral-600" />
            <DialogTitle>Configurar impresión</DialogTitle>
          </div>
          <DialogDescription className="mt-2">
            Verifique el papel, los márgenes y la escala antes de imprimir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-neutral-700">
          <p className="font-medium text-neutral-900">
            Antes de imprimir, verifique la configuracion de la impresora:
          </p>
          <ul className="space-y-2 rounded-xl bg-neutral-50 p-4">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
              <span>
                <strong>Papel:</strong> Carta (216 x 279 mm) / Letter 8.5 x 11 in
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

          <div className="flex items-start gap-2 rounded-xl bg-grave-50 p-3 text-grave-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-grave-600" />
            <span className="text-xs">
              No seleccione papel Legal (8.5 x 14 in) ni A4 (210 x 297 mm). El documento esta
              dimensionado para Carta de 216 x 279 mm (Letter).
            </span>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-leve-50 p-3 text-leve-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-leve-600" />
            <span className="text-xs">
              Después de imprimir, regrese a la aplicación y haga clic en “Marcar como procesada”
              para confirmar el trámite y registrarlo en el historial.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="rounded-xl bg-white px-4 py-2 font-medium"
          >
            Cancelar
          </Button>
          <Button
            variant="custom"
            onClick={onConfirm}
            className="rounded-xl bg-neutral-700 px-4 py-2 font-medium text-white hover:bg-neutral-800"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
