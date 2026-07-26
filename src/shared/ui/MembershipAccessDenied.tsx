/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect } from 'react';

interface MembershipAccessDeniedProps {
  authMode: string;
  legacyFallbackUsed: boolean;
  membershipError: string | null;
}

export function MembershipAccessDenied({
  authMode,
  legacyFallbackUsed,
  membershipError,
}: MembershipAccessDeniedProps) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (retrying) {
      window.location.reload();
    }
  }, [retrying]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-red-600 text-sm font-medium">No tiene acceso a esta aplicación</div>
        <p className="text-gray-600 text-sm">
          {membershipError ?? 'Su cuenta no tiene una membresía activa para esta aplicación.'}
        </p>
        {authMode === 'enforced' && (
          <p className="text-amber-600 text-xs">
            Modo restringido — solo usuarios con membresía activa pueden acceder.
          </p>
        )}
        {authMode === 'transition' && legacyFallbackUsed && (
          <p className="text-amber-600 text-xs">
            Modo transición — se intentó usar credenciales heredadas pero no fue suficiente.
          </p>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={() => setRetrying(true)}
            disabled={retrying}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {retrying ? 'Reintentando...' : 'Reintentar'}
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
