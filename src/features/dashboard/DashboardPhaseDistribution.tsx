/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa, FaseProcedimental } from "../../shared/lib/types";
import type { SidebarView } from "../../widgets/sidebar/Sidebar";
import { PHASE_STAGE_TONES as PHASE_CARDS } from "../../shared/lib/domain/phaseTones";
import { Archive, FileText } from "lucide-react";

type ActivePhase = { causa: Causa; phase: FaseProcedimental };
type PhaseFilter = "all" | "onTime" | "toResolve";

interface DashboardPhaseDistributionProps {
  activePhases: ActivePhase[];
  closedCount: number;
  visiblePhases: ActivePhase[];
  onTimeCount: number;
  toResolveCount: number;
  phaseFilter: PhaseFilter;
  setPhaseFilter: (value: PhaseFilter) => void;
  onFaseSelect: (fase: FaseProcedimental | "Todas") => void;
  onNavigate?: (view: SidebarView) => void;
}

export default function DashboardPhaseDistribution({
  activePhases,
  closedCount,
  visiblePhases,
  onTimeCount,
  toResolveCount,
  phaseFilter,
  setPhaseFilter,
  onFaseSelect,
  onNavigate,
}: DashboardPhaseDistributionProps) {
  const totalCases = activePhases.length + closedCount;
  const visibleTotal = visiblePhases.length + closedCount;
  return (
    <section
      aria-labelledby="dashboard-phases-title"
      className="card p-3 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-brand-50 p-2 text-brand-600">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <h2
              id="dashboard-phases-title"
              className="font-bold text-neutral-900 text-sm sm:text-base"
            >
              Distribución de Casos por Etapa Procesal
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-neutral-700 text-xs">
              {totalCases} casos
            </span>
          </div>
          <p className="mt-1 text-neutral-500 text-xs">
            Cada expediente se ubica en la etapa procesal que corresponde.
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtrar etapas procesales"
        >
          <span className="mr-1 text-neutral-500 text-xs">Filtrar vista:</span>
          {(
            [
              ["all", "Todos", activePhases.length],
              ["onTime", "Investigación en plazo", onTimeCount],
              ["toResolve", "Resolución / apelación", toResolveCount],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPhaseFilter(value)}
              aria-pressed={phaseFilter === value}
              className={`min-h-9 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${phaseFilter === value ? "bg-brand-600 text-white" : "bg-slate-100 text-neutral-700 hover:bg-slate-200"}`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-neutral-600 text-xs">
        <span>Secuencia procesal</span>
        <span>{visibleTotal} casos en la vista</span>
      </div>
      <div
        className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`Distribución de ${visibleTotal} casos por fase`}
      >
        {PHASE_CARDS.map(({ phase, color }) => {
          const count = visiblePhases.filter(
            (item) => item.phase === phase,
          ).length;
          return count > 0 ? (
            <span
              key={phase}
              className={color}
              style={{ width: `${(count / visibleTotal) * 100}%` }}
              aria-hidden="true"
            />
          ) : null;
        })}
        {closedCount > 0 ? (
          <span
            className="bg-leve-500"
            style={{ width: `${(closedCount / visibleTotal) * 100}%` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="mt-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {PHASE_CARDS.map(
            ({ phase, description, tone, badge, badgeTone }, index) => {
              const count = visiblePhases.filter(
                (item) => item.phase === phase,
              ).length;
              const percentage = visibleTotal
                ? Math.round((count / visibleTotal) * 100)
                : 0;
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => {
                    onFaseSelect(phase);
                    onNavigate?.("causas");
                  }}
                  aria-label={`Ver expedientes en etapa ${phase}`}
                  className="flex min-h-32 flex-col rounded-xl border border-neutral-200 bg-neutral-50/60 p-2.5 text-left transition-colors sm:min-h-36 sm:p-3 hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-bold text-xs ${tone}`}
                    >
                      ETAPA {index + 1}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${badgeTone}`}
                    >
                      {badge}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-neutral-900 text-sm">
                    {phase}
                  </h3>
                  <p className="mt-1 flex-1 text-neutral-600 text-xs leading-relaxed">
                    {description}
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-neutral-200 pt-2">
                    <span className="text-neutral-500 text-xs">
                      <strong className="mr-1 text-lg text-neutral-950 tabular-nums">
                        {count}
                      </strong>
                      casos
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 font-semibold text-xs tabular-nums ${tone}`}
                    >
                      {percentage}%
                    </span>
                  </div>
                </button>
              );
            },
          )}
          <button
            type="button"
            onClick={() => onNavigate?.("causas")}
            aria-label="Ver expedientes cerrados"
            className="flex min-h-32 flex-col rounded-xl border border-leve-200 bg-leve-50/30 p-2.5 text-left transition-colors hover:border-leve-300 hover:bg-leve-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leve-500 sm:min-h-36 sm:p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded px-1.5 py-0.5 font-bold text-leve-700 text-xs">
                ARCHIVADOS
              </span>
              <Archive className="size-4 text-leve-700" aria-hidden="true" />
            </div>
            <h3 className="mt-2 font-semibold text-neutral-900 text-sm">
              Cerrados
            </h3>
            <p className="mt-1 flex-1 text-neutral-600 text-xs leading-relaxed">
              Expedientes finalizados y disponibles para consulta.
            </p>
            <div className="mt-3 flex items-end justify-between gap-2 border-t border-leve-200 pt-2">
              <span className="text-neutral-500 text-xs">
                <strong className="mr-1 text-lg text-neutral-950 tabular-nums">
                  {closedCount}
                </strong>
                casos
              </span>
              <span className="rounded-md bg-leve-100 px-2 py-1 font-semibold text-leve-700 text-xs tabular-nums">
                {totalCases ? Math.round((closedCount / totalCases) * 100) : 0}%
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
