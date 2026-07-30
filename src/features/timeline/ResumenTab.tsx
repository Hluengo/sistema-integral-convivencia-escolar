/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  FileText,
  Files,
  ListChecks,
  MoveRight,
  UserRound,
} from 'lucide-react';
import type { Causa, FaseProcedimental } from '../../types';
import { getCausaDeadline, getCausaPhase, getCausaStatus } from '../causas/causaPresentation';
import { formatChileDate } from '../../shared/lib/dateTime';
import { getCausaOperationalSummary } from '../causas/causaOperationalSummary';

interface ResumenTabProps {
  causa: Causa;
  breaches: string[];
  selectedPhase: FaseProcedimental | null;
  onSelectPhase: (phase: FaseProcedimental | null) => void;
}

export default function ResumenTab({
  causa,
  breaches,
  selectedPhase,
  onSelectPhase,
}: ResumenTabProps) {
  const deadline = getCausaDeadline(causa);
  const completed = causa.checklistDebidoProceso.filter((item) => item.completado).length;
  const summary = getCausaOperationalSummary(causa);
  const deadlineClass = {
    normal: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    overdue: 'border-red-200 bg-red-50 text-red-800',
  }[deadline.tone];

  return (
    <div className="space-y-5">
      <section
        aria-labelledby="expediente-operativo-title"
        className="overflow-hidden rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-sky-50"
      >
        <div className="border-slate-200 border-b px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3
                id="expediente-operativo-title"
                className="font-semibold text-neutral-900 text-sm"
              >
                Ruta del expediente
              </h3>
              <p className="mt-0.5 text-neutral-500 text-xs">
                Avance por fase y foco operativo actual.
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 font-semibold text-xs ${deadlineClass}`}
            >
              Plazo: {deadline.text}
            </span>
          </div>
        </div>

        <ol className="grid grid-cols-5 gap-1 px-4 py-4 sm:gap-2 sm:px-5">
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
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full font-bold text-[10px] ${
                        isComplete
                          ? 'bg-emerald-600 text-white'
                          : isSelected || isCurrentPhase
                            ? 'bg-slate-800 text-white ring-4 ring-slate-200'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                      aria-hidden="true"
                    >
                      {isComplete ? <CircleCheck className="size-3" /> : index + 1}
                    </span>
                    <span className="hidden h-px flex-1 bg-slate-200 sm:block" aria-hidden="true" />
                  </div>
                  <p
                    className={`mt-2 truncate font-semibold text-[10px] sm:text-xs ${
                      isSelected || isCurrentPhase ? 'text-slate-900' : 'text-slate-500'
                    }`}
                    title={phase.phase}
                  >
                    {phase.phase}
                  </p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200">
                    <span
                      className={`block h-full rounded-full ${
                        isComplete
                          ? 'bg-emerald-500'
                          : isSelected || isCurrentPhase
                            ? 'bg-slate-700'
                            : 'bg-slate-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-3 border-slate-200 border-t bg-white/70 p-4 sm:grid-cols-3 sm:p-5">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-1.5 font-semibold text-slate-600 text-[11px] uppercase tracking-wide">
              <ListChecks className="size-3.5" aria-hidden="true" />
              Fase actual
            </p>
            <p className="mt-2 font-semibold text-neutral-900 text-sm">{summary.currentPhase}</p>
            <p className="mt-1 text-neutral-500 text-xs">
              {summary.currentPhaseProgress.completed} de {summary.currentPhaseProgress.total} hitos
              completados
            </p>
          </div>

          <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-3">
            <p className="flex items-center gap-1.5 font-semibold text-sky-700 text-[11px] uppercase tracking-wide">
              <MoveRight className="size-3.5" aria-hidden="true" />
              Próximo hito
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

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="flex items-center gap-1.5 font-semibold text-emerald-700 text-[11px] uppercase tracking-wide">
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Estado actual',
            value: getCausaStatus(causa),
            Icon: CheckCircle2,
            cardClass: 'border-violet-100 bg-violet-50',
            iconClass: 'text-violet-600',
          },
          {
            label: 'Fase actual',
            value: getCausaPhase(causa),
            Icon: FileText,
            cardClass: 'border-sky-100 bg-sky-50',
            iconClass: 'text-sky-600',
          },
          {
            label: 'Plazo de cierre',
            value: deadline.text,
            Icon: CalendarClock,
            cardClass: 'border-amber-100 bg-amber-50',
            iconClass: 'text-amber-700',
          },
          {
            label: 'Hitos registrados',
            value: `${completed} de ${causa.checklistDebidoProceso.length}`,
            Icon: UserRound,
            cardClass: 'border-emerald-100 bg-emerald-50',
            iconClass: 'text-emerald-600',
          },
        ].map(({ label, value, Icon, cardClass, iconClass }) => (
          <div key={label} className={`rounded-xl border p-4 ${cardClass}`}>
            <Icon className={`mb-2 size-5 ${iconClass}`} aria-hidden="true" />
            <p className="text-neutral-500 text-xs">{label}</p>
            <p className="mt-1 font-semibold text-neutral-900 text-sm">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="font-semibold text-neutral-900 text-sm">Antecedentes generales</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Apertura</dt>
            <dd className="font-medium">{formatChileDate(causa.fechaApertura)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Responsable</dt>
            <dd className="font-medium">{causa.responsable}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Tipificación</dt>
            <dd className="font-medium">
              {causa.comprometeAulaSegura ? 'Aula Segura' : causa.tipoInfraccion}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Última actualización</dt>
            <dd className="font-medium">{formatChileDate(causa.fechaUltimaActualizacion)}</dd>
          </div>
        </dl>
        <p className="mt-4 whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-neutral-700 text-sm">
          {causa.observaciones || 'Sin resumen del hecho registrado.'}
        </p>
      </section>

      {breaches.length > 0 && (
        <section className="rounded-xl border border-danger-200 bg-danger-50 p-4" role="alert">
          <h3 className="flex items-center gap-2 font-semibold text-danger-800 text-sm">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Alertas jurídicas o procedimentales
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-danger-800 text-sm">
            {breaches.map((breach) => (
              <li key={breach}>{breach}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
