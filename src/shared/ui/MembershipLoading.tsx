/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect } from 'react';
import Button from './Button';

interface MembershipLoadingProps {
  authMode: string;
  legacyFallbackUsed: boolean;
  timeoutMs?: number;
}

export function MembershipLoading({
  authMode,
  legacyFallbackUsed,
  timeoutMs = 10000,
}: MembershipLoadingProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-gravisima-600 text-sm font-medium">
            La verificación de membresía está tomando más de lo esperado.
          </div>
          <p className="text-gray-600 text-sm">
            Por favor, recargue la página o contacte al administrador.
          </p>
          <Button
            variant="custom"
            onClick={() => window.location.reload()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Recargar página
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        <p className="text-gray-600 text-sm">Verificando membresía...</p>
        {authMode === 'transition' && legacyFallbackUsed && (
          <p className="text-grave-600 text-xs">
            Modo transición — usando credenciales heredadas como respaldo.
          </p>
        )}
      </div>
    </div>
  );
}
