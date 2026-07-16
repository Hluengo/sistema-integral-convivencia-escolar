/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Cerrar atajos de teclado"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm animate-scale-in rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 font-semibold text-base text-neutral-900">Atajos de teclado</h3>
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
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full cursor-pointer rounded-xl bg-brand-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-brand-700"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
