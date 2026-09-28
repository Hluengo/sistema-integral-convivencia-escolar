/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from "react";
import {
  Calendar,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import type { Causa } from "../../shared/lib/types";
import {
  extractConductaFromObservation,
  getConductaReglamentada,
} from "../../reglamentoData";
import { getMaxPlazoInvestigacionDias } from "../../shared/lib/legalCompliance/constants";
import { getCausaDeadline } from "../causas/causaPresentation";
import { getCausaOperationalSummary } from "../causas/causaOperationalSummary";
import { formatChileDate } from "../../shared/lib/dateTime";

interface ResumenTabProps {
  causa: Causa;
  breaches: string[];
  onRegisterHito?: () => void;
}

const toneClasses = {
  normal: "border-leve-200 bg-leve-50 text-leve-700",
  warning: "border-grave-200 bg-grave-50 text-grave-700",
  overdue: "border-gravisima-200 bg-gravisima-50 text-gravisima-700",
} as const;

export default memo(function ResumenTab({
  causa,
  breaches,
  onRegisterHito,
}: ResumenTabProps) {
  const summary = getCausaOperationalSummary(causa);
  const deadline = getCausaDeadline(causa);
  const currentProgress = summary.currentPhaseProgress;
  const phasePct = currentProgress.total
    ? Math.round((currentProgress.completed / currentProgress.total) * 100)
    : 0;
  const maxDays = getMaxPlazoInvestigacionDias(
    causa.tipoInfraccion,
    causa.comprometeAulaSegura,
  );
  const deadlineUnit = maxDays === 10 ? "hábiles" : "corridos";
  const unidadPlazo = deadlineUnit;
  const conductDescription =
    getConductaReglamentada(causa.conductaRiceId)?.conducta ||
    extractConductaFromObservation(causa.observaciones);
  const nextAction = summary.nextChecklistItem
    ? `Próximo hito · ${summary.nextChecklistItem.label} (fase ${summary.nextChecklistPhase})`
    : "Sin hito pendiente en la ruta visible";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.85fr)]">
        <div className="space-y-3">
          <section
            aria-label="Centro operativo del expediente"
            className="space-y-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-neutral-950">
                    Centro Operativo del Expediente
                  </h2>
                  <span className="rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                    Fase {summary.currentPhase}
                  </span>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 sm:flex">
                <span className="font-bold text-neutral-950">
                  {summary.completedHitos}/{summary.totalHitos}
                </span>{" "}
                hitos <span className="text-neutral-300">·</span>
                <span className="font-bold text-neutral-950">
                  {summary.documentsCount}
                </span>{" "}
                docs <span className="text-neutral-300">·</span>
                <span className="font-bold text-neutral-950">
                  {summary.historyCount}
                </span>{" "}
                registros
              </div>
            </div>

            <div
              aria-label={nextAction}
              className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-brand-700 shadow-xs">
                <ClipboardCheck className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Próximo Hito Obligatorio
                  </span>
                  <span className="rounded border border-grave-200 bg-grave-50 px-2 py-0.5 text-xs font-semibold text-grave-700">
                    {summary.nextChecklistItem ? "Pendiente" : "Completado"}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-bold text-neutral-950">
                  {summary.nextChecklistItem?.label ||
                    "No hay hitos pendientes"}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  {summary.nextChecklistItem?.descripcion ||
                    "La fase actual no tiene actuaciones pendientes."}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-600">
                  {currentProgress.total > 0 &&
                  currentProgress.completed >= currentProgress.total ? (
                    "Fase completada · lista para avanzar"
                  ) : (
                    <>
                      Avance de fase:{" "}
                      <strong className="text-neutral-950">
                        {currentProgress.completed} de {currentProgress.total}{" "}
                        completadas
                      </strong>
                    </>
                  )}
                </span>
                <span className="font-bold text-brand-600">{phasePct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-2 rounded-full bg-brand-600 transition-all duration-300"
                  style={{ width: `${phasePct}%` }}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
              <h2 className="text-base font-bold text-neutral-950">
                Antecedentes Generales
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                <FileText className="size-3" aria-hidden="true" /> Detalle
                formal
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                  <CalendarClock
                    className="size-3.5 text-neutral-400"
                    aria-hidden="true"
                  />{" "}
                  Apertura
                </div>
                <div className="mt-1 text-base font-bold text-neutral-950">
                  {formatChileDate(causa.fechaApertura)}
                </div>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
                  <CalendarClock
                    className="size-3.5 text-neutral-400"
                    aria-hidden="true"
                  />{" "}
                  Plazo de investigación
                </div>
                <div className="mt-1 text-base font-bold text-neutral-950">
                  {maxDays} días {unidadPlazo}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Descripción de la Falta
              </span>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-700">
                {conductDescription ||
                  "No se ha asociado una conducta específica del RICE."}
              </div>
            </div>
            <details className="group rounded-xl border border-neutral-200 p-3.5 text-xs hover:bg-neutral-50">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-brand-600">
                <span className="inline-flex items-center gap-2">
                  <ChevronRight
                    className="size-3 transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  />{" "}
                  Relato de los hechos · ver completo
                </span>
                <span className="text-neutral-400">Expandir detalle</span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-neutral-700">
                {causa.observaciones || "Sin relato de los hechos registrado."}
              </p>
            </details>
          </section>
        </div>

        <aside className="space-y-3">
          <button
            type="button"
            onClick={onRegisterHito}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00628F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#005177] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00628F] focus-visible:ring-offset-2"
          >
            <span className="text-base leading-none">+</span> Registrar Hito
          </button>
          <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
            <h3 className="border-b border-neutral-100 pb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
              Ficha del Expediente
            </h3>
            <dl className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">Tipificación</dt>
                <dd className="rounded border border-grave-200 bg-grave-50 px-2 py-0.5 font-semibold text-grave-700">
                  {causa.comprometeAulaSegura
                    ? "Aula Segura"
                    : causa.tipoInfraccion}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">Responsable</dt>
                <dd className="font-semibold text-neutral-800">
                  {causa.responsable || "Equipo Convivencia"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">Fase Actual</dt>
                <dd className="flex items-center gap-1.5 font-semibold text-brand-600">
                  <span className="size-1.5 rounded-full bg-brand-600" />
                  {summary.currentPhase}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-neutral-500">Última actualización</dt>
                <dd className="font-semibold text-neutral-800">
                  {formatChileDate(causa.fechaUltimaActualizacion)}
                </dd>
              </div>
            </dl>
          </section>
          <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Estado de Plazo
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[deadline.tone]}`}
              >
                <span className="size-1.5 rounded-full bg-current" />
                {deadline.tone === "overdue"
                  ? "Plazo excedido"
                  : deadline.tone === "warning"
                    ? "Requiere atención"
                    : "En plazo regular"}
              </span>
            </div>
            <div>
              <div className="mb-2 flex items-baseline justify-between text-xs">
                <span className="text-neutral-500">Tiempo restante</span>
                <span className="text-sm font-bold text-neutral-950">
                  {deadline.text}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className={`h-1.5 rounded-full ${deadline.tone === "overdue" ? "bg-gravisima-500" : deadline.tone === "warning" ? "bg-grave-500" : "bg-leve-500"}`}
                  style={{
                    width: `${Math.max(4, Math.min(100, (deadline.remainingDays / Math.max(maxDays, 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>
            <p className="flex items-center justify-end gap-1 pt-1 text-[11px] text-neutral-600">
              <Calendar className="size-3" aria-hidden="true" /> Cierre
              proyectado el {formatChileDate(deadline.deadlineDate)}
            </p>
          </section>
          {breaches.length > 0 && (
            <section
              className="rounded-xl border border-gravisima-200 bg-gravisima-50 p-4 text-xs text-gravisima-800"
              role="alert"
            >
              <p className="font-semibold">Alertas procedimentales</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {breaches.map((breach) => (
                  <li key={breach}>{breach}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
});
