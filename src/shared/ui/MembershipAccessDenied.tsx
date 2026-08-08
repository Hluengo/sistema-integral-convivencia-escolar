/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect } from 'react';
import Button from './Button';

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
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-gravisima-600 text-sm font-medium">
          No tiene acceso a esta aplicación
        </div>
        <p className="text-neutral-600 text-sm">
          {membershipError ?? 'Su cuenta no tiene una membresía activa para esta aplicación.'}
        </p>
        {authMode === 'enforced' && (
          <p className="text-grave-600 text-xs">
            Modo restringido — solo usuarios con membresía activa pueden acceder.
          </p>
        )}
        {authMode === 'transition' && legacyFallbackUsed && (
          <p className="text-grave-600 text-xs">
            Modo transición — se intentó usar credenciales heredadas pero no fue suficiente.
          </p>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <Button
            variant="custom"
            onClick={() => setRetrying(true)}
            disabled={retrying}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {retrying ? 'Reintentando...' : 'Reintentar'}
          </Button>
          <Button
            variant="custom"
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
            className="rounded-md bg-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-300"
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
