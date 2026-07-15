/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
      <div key="lock" className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
        <div className="flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Etapa de progreso bloqueada</p>
            <p className="text-amber-700 mt-1">El estudiante se encuentra en una etapa donde la emisión de documentos está restringida.</p>
            <label className="flex items-center gap-2 mt-2 text-amber-700 cursor-pointer">
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
      <div key="threshold" className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">Umbral no alcanzado</p>
            <p className="text-yellow-700 mt-1">Se requieren al menos 10 anotaciones negativas para emitir una Carta de Compromiso. Actualmente tiene {negativeCount}.</p>
            <label className="flex items-center gap-2 mt-2 text-yellow-700 cursor-pointer">
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
      <div key="duplicate" className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-blue-800">Documento existente</p>
            <p className="text-blue-700 mt-1">Ya existe una carta de este tipo emitida para este estudiante ({existingLetter.emission_date}).</p>
            <label className="flex items-center gap-2 mt-2 text-blue-700 cursor-pointer">
              <input type="checkbox" checked={authorizedDuplicate} onChange={onAuthorizedDuplicate} className="rounded border-blue-300" />
              Autorizar duplicado
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (warnings.length === 0) return null;

  return <div className="space-y-2">{warnings}</div>;
}
