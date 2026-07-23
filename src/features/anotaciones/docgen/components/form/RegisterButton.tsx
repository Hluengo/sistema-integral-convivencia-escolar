/** @license SPDX-License-Identifier: Apache-2.0 */

import { FileText } from 'lucide-react';
export default function RegisterButton({
  onClick,
  disabled = false,
  isRegistering = false,
}: { onClick: () => void; disabled?: boolean; isRegistering?: boolean }) {
  return (
    <div className="border-neutral-200 border-t pt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileText className="h-5 w-5" />
        {isRegistering ? 'Registrando...' : 'Registrar y Emitir Carta'}
      </button>
    </div>
  );
}