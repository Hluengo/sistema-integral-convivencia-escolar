/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface DocumentWarningsProps {
  docType: string;
  hasTenOrMore: boolean;
  negativeCount: number;
  isDocLockedByProgress: boolean;
  bypassProgressLock: boolean;
  onBypassProgressLock: () => void;
  authorizedBypass: boolean;
  onAuthorizedBypass: () => void;
  existingLetter: any | null;
  authorizedDuplicate: boolean;
  onAuthorizedDuplicate: () => void;
}

export default function DocumentWarnings({
  docType,
  hasTenOrMore,
  negativeCount,
  isDocLockedByProgress,
  bypassProgressLock,
  onBypassProgressLock,
  authorizedBypass,
  onAuthorizedBypass,
  existingLetter,
  authorizedDuplicate,
  onAuthorizedDuplicate,
}: DocumentWarningsProps) {
  const warnings: React.ReactNode[] = [];

  if (isDocLockedByProgress) {
    warnings.push(
      <div key="lock" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Etapa de progreso bloqueada</p>
            <p className="mt-1 text-amber-700">El estudiante se encuentra en una etapa donde la emisión de documentos está restringida.</p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-amber-700">
              <input type="checkbox" checked={bypassProgressLock} onChange={onBypassProgressLock} className="rounded border-amber-300" />
              Autorizar emisión ignorando bloqueo de etapa
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (docType === 'compromiso_conductual' && !hasTenOrMore) {
    warnings.push(
      <div key="threshold" className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">Umbral no alcanzado</p>
            <p className="mt-1 text-yellow-700">Se requieren al menos 10 anotaciones negativas para emitir una Carta de Compromiso. Actualmente tiene {negativeCount}.</p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-yellow-700">
              <input type="checkbox" checked={authorizedBypass} onChange={onAuthorizedBypass} className="rounded border-yellow-300" />
              Autorizar emisión excepcional
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (existingLetter) {
    warnings.push(
      <div key="duplicate" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="font-medium text-blue-800">Documento existente</p>
            <p className="mt-1 text-blue-700">Ya existe una carta de este tipo emitida para este estudiante ({existingLetter.emission_date}).</p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-blue-700">
              <input type="checkbox" checked={authorizedDuplicate} onChange={onAuthorizedDuplicate} className="rounded border-blue-300" />
              Autorizar duplicado
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (warnings.length === 0) { return null; }

  return <div className="space-y-2">{warnings}</div>;
}
