/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/shared/ui/Dialog';
import Button from '@/src/shared/ui/Button';

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="block">
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription className="sr-only">
            Lista de combinaciones disponibles en la aplicación.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-neutral-600 text-sm">
          <li className="flex justify-between">
            <span>Nueva causa</span>
            <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">N</kbd>
          </li>
          <li className="flex justify-between">
            <span>Atajos</span>
            <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">?</kbd>
          </li>
          <li className="flex justify-between">
            <span>Cerrar modal</span>
            <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">Esc</kbd>
          </li>
          <li className="flex justify-between">
            <span>Paleta de comandos</span>
            <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">Ctrl+K</kbd>
          </li>
        </ul>
        <DialogFooter>
          <Button fullWidth onClick={onClose} className="rounded-xl px-4 py-2 font-medium">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
