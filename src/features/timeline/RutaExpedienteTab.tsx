/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from 'react';
import { ArrowRight, CircleCheck, Files, ListChecks, MoveRight } from 'lucide-react';
import type { Causa, FaseProcedimental } from '../../shared/lib/types';
import { getCausaDeadline } from '../causas/causaPresentation';
import { getCausaOperationalSummary } from '../causas/causaOperationalSummary';

interface RutaExpedienteTabProps {
  causa: Causa;
  selectedPhase: FaseProcedimental | null;
  onSelectPhase: (phase: FaseProcedimental | null) => void;
}

export default memo(function RutaExpedienteTab({
  causa,
  selectedPhase,
  onSelectPhase,
}: RutaExpedienteTabProps) {
  const deadline = getCausaDeadline(causa);
  const summary = getCausaOperationalSummary(causa);
  const deadlineClass = {
    normal: 'border-leve-200 bg-leve-50 text-leve-700',
    warning: 'border-grave-200 bg-grave-50 text-grave-700',
    overdue: 'border-gravisima-200 bg-gravisima-50 text-gravisima-700',
  }[deadline.tone];

  return (
    <section
      aria-labelledby="expediente-operativo-title"
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
    >
      <div className="border-neutral-200 border-b px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="expediente-operativo-title" className="font-semibold text-neutral-900 text-sm">
              Ruta del expediente
            </h3>
            <p className="mt-0.5 text-neutral-500 text-xs">
              Elige una fase para registrar y consultar sus hitos.
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 font-semibold text-xs ${deadlineClass}`}
          >
            Plazo: {deadline.text}
          </span>
        </div>
      </div>

      <ol className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-5 sm:gap-2 sm:px-5">
        {summary.phaseProgress.map((phase, index) => {
          const percentage =
            phase.total > 0 ? Math.round((phase.completed / phase.total) * 100) : 0;
          const isCurrentPhase = phase.phase === summary.currentPhase;
          const isComplete = phase.total > 0 && phase.completed === phase.total;
          const isSelected = phase.phase === selectedPhase;

          return (
            <li key={phase.phase} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelectPhase(isSelected ? null : phase.phase)}
                aria-expanded={isSelected}
                aria-controls="phase-workspace"
                className="group w-full rounded-lg text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                aria-label={`${isSelected ? 'Cerrar' : 'Trabajar'} hitos de ${phase.phase}`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full font-bold text-10px ${
                      isComplete
                        ? 'bg-leve-600 text-white'
                        : isSelected || isCurrentPhase
                          ? 'bg-neutral-800 text-white ring-4 ring-neutral-200'
                          : 'bg-neutral-200 text-neutral-600'
                    }`}
                    aria-hidden="true"
                  >
                    {isComplete ? <CircleCheck className="size-3" /> : index + 1}
                  </span>
                  <span className="hidden h-px flex-1 bg-neutral-200 sm:block" aria-hidden="true" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <p
                    className={`truncate font-semibold text-10px sm:text-xs ${
                      isSelected || isCurrentPhase ? 'text-neutral-900' : 'text-neutral-500'
                    }`}
                    title={phase.phase}
                  >
                    {phase.phase}
                  </p>
                  <span
                    className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold text-8px transition-colors ${
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : 'bg-brand-50 text-brand-700 group-hover:bg-brand-100'
                    }`}
                    aria-hidden="true"
                  >
                    <span className="hidden sm:inline">Abrir</span>
                    <ArrowRight className="size-3" />
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-neutral-200">
                  <span
                    className={`block h-full rounded-full ${
                      isComplete
                        ? 'bg-leve-500'
                        : isSelected || isCurrentPhase
                          ? 'bg-neutral-700'
                          : 'bg-neutral-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-3 border-neutral-200 border-t bg-neutral-50/70 p-4 sm:grid-cols-3 sm:p-5">
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <p className="flex items-center gap-1.5 font-semibold text-neutral-600 text-11px uppercase tracking-wide">
            <ListChecks className="size-3.5" aria-hidden="true" />
            Fase actual
          </p>
          <p className="mt-2 font-semibold text-neutral-900 text-sm">{summary.currentPhase}</p>
          <p className="mt-1 text-neutral-500 text-xs">
            {summary.currentPhaseProgress.completed} de {summary.currentPhaseProgress.total} hitos
            completados
          </p>
          {summary.laterActivityPhase ? (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-amber-800 text-xs">
              Hay actividad registrada en {summary.laterActivityPhase}. Revisa el estado actual.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-3">
          <p className="flex items-center gap-1.5 font-semibold text-sky-700 text-11px uppercase tracking-wide">
            <MoveRight className="size-3.5" aria-hidden="true" />
            Próximo hito{summary.nextChecklistPhase ? ` · ${summary.nextChecklistPhase}` : ''}
          </p>
          {summary.nextChecklistItem ? (
            <>
              <p className="mt-2 font-semibold text-neutral-900 text-sm">
                {summary.nextChecklistItem.label}
              </p>
              <p className="mt-1 line-clamp-2 text-neutral-600 text-xs">
                {summary.nextChecklistItem.descripcion}
              </p>
            </>
          ) : (
            <p className="mt-2 font-medium text-neutral-700 text-sm">
              Sin hitos pendientes en esta etapa.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-leve-100 bg-leve-50/70 p-3">
          <p className="flex items-center gap-1.5 font-semibold text-leve-700 text-11px uppercase tracking-wide">
            <Files className="size-3.5" aria-hidden="true" />
            Actividad registrada
          </p>
          <div className="mt-2 space-y-1 text-neutral-700 text-xs">
            <p>
              <strong className="text-neutral-900">{summary.completedHitos}</strong> hitos
              completados
            </p>
            <p>
              <strong className="text-neutral-900">{summary.documentsCount}</strong> documentos
              registrados
            </p>
            <p>
              <strong className="text-neutral-900">{summary.historyCount}</strong> registros en
              historial
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});
