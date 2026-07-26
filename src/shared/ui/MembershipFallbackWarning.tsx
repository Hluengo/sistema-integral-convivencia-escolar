/** @license SPDX-License-Identifier: Apache-2.0 */

interface MembershipFallbackWarningProps {
  authMode: string;
  legacyFallbackUsed: boolean;
  onDismiss?: () => void;
}

export function MembershipFallbackWarning({
  authMode,
  legacyFallbackUsed,
  onDismiss,
}: MembershipFallbackWarningProps) {
  if (!legacyFallbackUsed || authMode !== 'transition') return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
      <div className="flex items-start gap-2">
        <div className="text-amber-600 text-sm mt-0.5">⚠</div>
        <div className="flex-1">
          <p className="text-amber-800 text-sm font-medium">Usando credenciales heredadas</p>
          <p className="text-amber-700 text-xs mt-1">
            Esta cuenta está usando el sistema de autenticación heredado. La membresía será
            verificada próximamente. Si tiene problemas, contacte al administrador.
          </p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-amber-500 hover:text-amber-700 text-sm">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
