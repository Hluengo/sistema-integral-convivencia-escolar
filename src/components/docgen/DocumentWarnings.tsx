import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';

type DocType = 'amonestacion' | 'derivacion' | 'compromiso_conductual';

interface DocumentWarningsProps {
  docType: DocType;
  currentStep?: number;
  hasTenOrMore: boolean;
  negativeCount: number;
  isDocLockedByProgress: boolean;
  bypassProgressLock: boolean;
  onBypassProgressLock: (v: boolean) => void;
  authorizedBypass: boolean;
  onAuthorizedBypass: (v: boolean) => void;
  existingLetter?: { emittedAt: string; status: string } | null;
  authorizedDuplicate: boolean;
  onAuthorizedDuplicate: (v: boolean) => void;
}

const getRequiredStep = (type: DocType) => {
  if (type === 'amonestacion') return 2;
  if (type === 'compromiso_conductual') return 3;
  if (type === 'derivacion') return 4;
  return 1;
};

export default function DocumentWarnings({
  docType,
  currentStep,
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
  return (
    <>
      {/* Progress stage lock warning */}
      {isDocLockedByProgress && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
          <p className="text-[11px] text-amber-800 leading-normal flex items-start gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
            <span>
              Este documento corresponde a una etapa disciplinaria superior (Etapa {getRequiredStep(docType)}) a la actual
              (Etapa {currentStep}). Se recomienda avanzar el debido proceso manualmente en la pestaña de resumen de ficha
              del estudiante.
            </span>
          </p>
          <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bypassProgressLock}
              onChange={(e) => onBypassProgressLock(e.target.checked)}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <span>Desbloquear documento para emisión excepcional</span>
          </label>
        </div>
      )}

      {/* Compromiso Conductual threshold warning */}
      {docType === 'compromiso_conductual' && !hasTenOrMore && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
          <p className="text-[11px] text-amber-800 leading-normal flex items-start gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
            <span>
              Este documento institucional está reglamentado para alumnos con <strong>10 o más</strong> anotaciones negativas.
              El estudiante actual tiene <strong>{negativeCount}</strong> anotaciones.
            </span>
          </p>
          <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={authorizedBypass}
              onChange={(e) => onAuthorizedBypass(e.target.checked)}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <span>Omitir restricción reglamentaria</span>
          </label>
        </div>
      )}

      {/* Duplicate letter warning */}
      {docType === 'compromiso_conductual' && existingLetter && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2">
          <p className="text-[11px] text-rose-800 leading-normal flex items-start gap-1.5 font-semibold">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-rose-600 shrink-0" />
            <span>
              ¡ALERTA DE DUPLICIDAD! Ya se emitió un documento para este estudiante el {existingLetter.emittedAt}. Estado:{' '}
              {existingLetter.status}.
            </span>
          </p>
          <label className="flex items-center gap-2 text-xs font-bold text-rose-900 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={authorizedDuplicate}
              onChange={(e) => onAuthorizedDuplicate(e.target.checked)}
              className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
            <span>Autorizar duplicación excepcional</span>
          </label>
        </div>
      )}
    </>
  );
}
