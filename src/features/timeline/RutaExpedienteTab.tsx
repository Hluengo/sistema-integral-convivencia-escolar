/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from "react";
import {
  ArrowRight,
  CircleCheck,
  Files,
  ListChecks,
  MoveRight,
} from "lucide-react";
import type { Causa, FaseProcedimental } from "../../shared/lib/types";
import { getCausaDeadlineStages } from "../causas/causaPresentation";
import { getCausaOperationalSummary } from "../causas/causaOperationalSummary";
import { getFaseForEstado } from "../../shared/lib/data";
import { formatChileDate } from "../../shared/lib/dateTime";

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
  const deadlines = getCausaDeadlineStages(causa);
  const summary = getCausaOperationalSummary(causa);
  const currentFase = getFaseForEstado(causa.estadoActual) as FaseProcedimental;
  const showConcluyente =
    deadlines.informeConcluyente !== null &&
    ["Resolución", "Apelación", "Seguimiento"].includes(currentFase);
  const deadlineClass = (tone: "normal" | "warning" | "overdue") =>
    ({
      normal: "border-leve-200 bg-leve-50 text-leve-700",
      warning: "border-grave-200 bg-grave-50 text-grave-700",
      overdue: "border-gravisima-200 bg-gravisima-50 text-gravisima-700",
    })[tone];

  return (
    <section
      aria-labelledby="expediente-operativo-title"
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
    >
      <div className="border-neutral-200 border-b px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3
              id="expediente-operativo-title"
              className="font-semibold text-neutral-900 text-sm"
            >
              Ruta del expediente
            </h3>
            <p className="mt-0.5 text-neutral-500 text-xs">
              Elige una fase para registrar y consultar sus hitos.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 font-semibold text-xs ${deadlineClass(deadlines.cierreIndagacion.tone)}`}
            >
              Plazo: Cierre:{" "}
              {formatChileDate(deadlines.cierreIndagacion.deadlineDate)} ·{" "}
              {deadlines.cierreIndagacion.text}
            </span>
            {showConcluyente && deadlines.informeConcluyente && (
              <span
                className={`rounded-full border px-2.5 py-1 font-semibold text-xs ${deadlineClass(deadlines.informeConcluyente.tone)}`}
              >
                Concluyente: {deadlines.informeConcluyente.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Desktop stepper: 5 columnas */}
      <ol className="hidden gap-2 px-5 py-4 sm:grid sm:grid-cols-5">
        {summary.phaseProgress.map((phase, index) => {
          const percentage =
            phase.total > 0
              ? Math.round((phase.completed / phase.total) * 100)
              : 0;
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
                aria-label={`${isSelected ? "Cerrar" : "Trabajar"} hitos de ${phase.phase}`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
                      isComplete
                        ? "size-6 bg-green-600 text-white text-10px"
                        : isSelected || isCurrentPhase
                          ? "size-7 bg-brand-600 text-white text-xs ring-4 ring-brand-100"
                          : "size-6 bg-neutral-150 text-neutral-600 text-10px"
                    }`}
                    aria-hidden="true"
                  >
                    {isComplete ? (
                      <CircleCheck className="size-3.5" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className="h-px flex-1 bg-neutral-150"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <p
                    className={`truncate font-semibold text-xs ${
                      isSelected || isCurrentPhase
                        ? "text-neutral-900"
                        : "text-neutral-500"
                    }`}
                    title={phase.phase}
                  >
                    {phase.phase}
                  </p>
                  <span
                    className={`flex shrink-0 items-center gap-0.5 rounded-full border px-2 py-0.5 font-bold text-10px transition-colors ${
                      isSelected
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-brand-200 bg-brand-50 text-brand-700 group-hover:bg-brand-100"
                    }`}
                    aria-hidden="true"
                  >
                    Ver hitos
                    <ArrowRight className="size-3" />
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-150">
                  <span
                    className={`block h-full rounded-full ${
                      isComplete
                        ? "bg-green-600"
                        : isSelected || isCurrentPhase
                          ? "bg-brand-600"
                          : "bg-neutral-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Mobile stepper: vertical */}
      <ol
        className="flex flex-col gap-0 px-4 py-3 sm:hidden"
        aria-label="Ruta del expediente vertical"
      >
        {summary.phaseProgress.map((phase, index) => {
          const percentage =
            phase.total > 0
              ? Math.round((phase.completed / phase.total) * 100)
              : 0;
          const isCurrentPhase = phase.phase === summary.currentPhase;
          const isComplete = phase.total > 0 && phase.completed === phase.total;
          const isSelected = phase.phase === selectedPhase;
          const isLast = index === summary.phaseProgress.length - 1;

          return (
            <li key={phase.phase} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex shrink-0 items-center justify-center rounded-full font-bold ${
                    isComplete
                      ? "size-7 bg-green-600 text-white text-xs"
                      : isSelected || isCurrentPhase
                        ? "size-8 bg-brand-600 text-white text-sm ring-4 ring-brand-100"
                        : "size-7 bg-neutral-150 text-neutral-600 text-xs"
                  }`}
                  aria-hidden="true"
                >
                  {isComplete ? <CircleCheck className="size-4" /> : index + 1}
                </span>
                {!isLast && (
                  <span
                    className={`mt-1 w-1.5 flex-1 rounded-full ${
                      isComplete ? "bg-green-600" : "bg-neutral-150"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-4">
                <button
                  type="button"
                  onClick={() => onSelectPhase(isSelected ? null : phase.phase)}
                  aria-expanded={isSelected}
                  aria-controls="phase-workspace"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1 text-left transition hover:border-neutral-150 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <div className="min-w-0">
                    <p
                      className={`truncate font-semibold text-sm ${
                        isSelected || isCurrentPhase
                          ? "text-neutral-900"
                          : "text-neutral-600"
                      }`}
                    >
                      {phase.phase}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {phase.completed}/{phase.total} hitos · {percentage}%
                    </p>
                  </div>
                  <span
                    className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-bold text-xs ${
                      isSelected
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-brand-200 bg-brand-50 text-brand-700"
                    }`}
                    aria-hidden="true"
                  >
                    Ver hitos
                    <ArrowRight className="size-3.5" />
                  </span>
                </button>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-150">
                  <span
                    className={`block h-full rounded-full ${
                      isComplete
                        ? "bg-green-600"
                        : isSelected || isCurrentPhase
                          ? "bg-brand-600"
                          : "bg-neutral-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-3 border-neutral-150 border-t bg-neutral-50/60 p-4 sm:grid-cols-[1fr_1.4fr_1fr] sm:p-5">
        <div className="rounded-lg border border-neutral-150 border-l-4 border-l-brand-600 bg-white p-3 shadow-xs">
          <p className="flex items-center gap-1.5 font-semibold text-neutral-600 text-xs">
            <ListChecks className="size-3.5" aria-hidden="true" />
            Fase actual
          </p>
          <p className="mt-1 font-bold text-neutral-900 text-base">
            {summary.currentPhase}
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="font-bold text-2xl text-brand-700">
              {summary.currentPhaseProgress.completed}/
              {summary.currentPhaseProgress.total}
            </span>
            <span className="text-neutral-600 text-xs">hitos</span>
          </p>
          {summary.laterActivityPhase ? (
            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-amber-800 text-xs">
              Hay actividad registrada en {summary.laterActivityPhase}. Revisa
              el estado actual.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-neutral-150 bg-white p-3 shadow-xs">
          <p className="flex items-center gap-1.5 font-semibold text-brand-800 text-xs">
            <MoveRight className="size-3.5" aria-hidden="true" />
            Próximo hito
            {summary.nextChecklistPhase
              ? ` · ${summary.nextChecklistPhase}`
              : ""}
          </p>
          {summary.nextChecklistItem ? (
            <>
              <p className="mt-2 font-semibold text-neutral-900 text-sm">
                {summary.nextChecklistItem.label}
              </p>
              <p className="mt-1 line-clamp-2 text-neutral-600 text-xs">
                {summary.nextChecklistItem.descripcion}
              </p>
              <button
                type="button"
                onClick={() =>
                  onSelectPhase(summary.nextChecklistPhase as FaseProcedimental)
                }
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
              >
                Registrar <ArrowRight className="size-3" />
              </button>
            </>
          ) : (
            <p className="mt-2 font-medium text-neutral-700 text-sm">
              Sin hitos pendientes en esta etapa.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-neutral-150 bg-white p-3 shadow-xs">
          <p className="flex items-center gap-1.5 font-semibold text-neutral-600 text-xs">
            <Files className="size-3.5" aria-hidden="true" />
            Actividad registrada
          </p>
          <div className="mt-2 space-y-1.5 text-neutral-700 text-xs">
            <p className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-green-100 text-green-700">
                <ListChecks className="size-3.5" />
              </span>
              <strong className="text-sm text-neutral-900">
                {summary.completedHitos}
              </strong>{" "}
              hitos completados
            </p>
            <p className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Files className="size-3.5" />
              </span>
              <strong className="text-sm text-neutral-900">
                {summary.documentsCount}
              </strong>{" "}
              documentos
            </p>
            <p className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                <ListChecks className="size-3.5" />
              </span>
              <strong className="text-sm text-neutral-900">
                {summary.historyCount}
              </strong>{" "}
              registros en historial
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});
