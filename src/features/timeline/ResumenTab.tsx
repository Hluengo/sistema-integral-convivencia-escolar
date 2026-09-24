/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileCheck2,
  FileText,
  UserRound,
} from "lucide-react";
import type { Causa } from "../../shared/lib/types";
import {
  extractConductaFromObservation,
  getConductaReglamentada,
} from "../../reglamentoData";
import {
  MAX_PLAZO_INVESTIGACION_DIAS,
  getMaxPlazoInvestigacionDias,
} from "../../shared/lib/legalCompliance/constants";
import { getCausaOperationalSummary } from "../causas/causaOperationalSummary";
import { formatChileDate } from "../../shared/lib/dateTime";
import IncidentePanel from "./IncidentePanel";

interface ResumenTabProps {
  causa: Causa;
  breaches: string[];
  privacyMode: boolean;
}

export default memo(function ResumenTab({
  causa,
  breaches,
  privacyMode,
}: ResumenTabProps) {
  const summary = getCausaOperationalSummary(causa);
  const completed = summary.completedHitos;
  const totalHitos = causa.checklistDebidoProceso.length;
  const currentProgress = summary.currentPhaseProgress;
  const phasePct = currentProgress.total
    ? Math.round((currentProgress.completed / currentProgress.total) * 100)
    : 0;
  const phaseComplete =
    currentProgress.total > 0 &&
    currentProgress.completed >= currentProgress.total;
  const maxDias =
    causa.plazoInvestigacionDias ??
    getMaxPlazoInvestigacionDias(
      causa.tipoInfraccion,
      causa.comprometeAulaSegura,
    );
  const unidadPlazo =
    maxDias === MAX_PLAZO_INVESTIGACION_DIAS ? "corridos" : "hábiles";
  const relatoLargo = (causa.observaciones?.length ?? 0) > 240;
  const nextAction = summary.nextChecklistItem
    ? `Próximo hito · ${summary.nextChecklistItem.label} (fase ${summary.nextChecklistPhase})`
    : "Sin hito pendiente en la ruta visible";
  const conductaDescripcion =
    getConductaReglamentada(causa.conductaRiceId)?.conducta ||
    extractConductaFromObservation(causa.observaciones);

  return (
    <div className="space-y-4">
      {causa.incidenteId && (
        <IncidentePanel causa={causa} privacyMode={privacyMode} />
      )}

      {/* Hero del Centro Operativo */}
      <section
        aria-label="Centro operativo del expediente"
        className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5"
      >
        <div className="flex flex-col gap-3.5">
          {/* Encabezado y Fase Actual */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <ClipboardList className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Centro operativo del expediente
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">
                    Fase operativa:
                  </span>
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                    {summary.currentPhase}
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen cuantitativo */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <strong className="font-semibold text-neutral-900">
                  {completed}/{totalHitos}
                </strong>{" "}
                hitos
              </span>
              <span className="text-neutral-300">·</span>
              <span className="inline-flex items-center gap-1">
                <strong className="font-semibold text-neutral-900">
                  {summary.documentsCount}
                </strong>{" "}
                docs
              </span>
              <span className="text-neutral-300">·</span>
              <span className="inline-flex items-center gap-1">
                <strong className="font-semibold text-neutral-900">
                  {summary.historyCount}
                </strong>{" "}
                registros
              </span>
            </div>
          </div>

          {/* Próximo hito operacional */}
          <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 sm:p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-900"
                  title={nextAction}
                >
                  <FileCheck2
                    className="size-4 shrink-0 text-brand-600"
                    aria-hidden="true"
                  />
                  {nextAction}
                </p>
                {summary.nextChecklistItem?.descripcion && (
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                    {summary.nextChecklistItem.descripcion}
                  </p>
                )}
              </div>
              {summary.nextChecklistItem && (
                <span className="shrink-0 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs">
                  Pendiente
                </span>
              )}
            </div>
          </div>

          {/* Barra de progreso de la fase */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700">
                {phaseComplete
                  ? "Fase completada · lista para avanzar"
                  : `Avance de fase ${currentProgress.completed}/${currentProgress.total} · ${phasePct}%`}
              </span>
              <span className="font-mono text-neutral-500 tabular-nums">
                {phasePct}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
              role="progressbar"
              aria-label={`Avance de fase ${summary.currentPhase}`}
              aria-valuenow={currentProgress.completed}
              aria-valuemin={0}
              aria-valuemax={Math.max(currentProgress.total, 1)}
              aria-valuetext={`${currentProgress.completed} de ${currentProgress.total} hitos, ${phasePct} por ciento`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  phaseComplete ? "bg-leve-600" : "bg-brand-600"
                }`}
                style={{ width: `${phasePct}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid de 4 tarjetas de datos del expediente */}
      <section
        aria-label="Datos del expediente"
        className="card grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-neutral-200"
      >
        {[
          {
            label: "Tipificación",
            value: causa.comprometeAulaSegura
              ? "Aula Segura"
              : causa.tipoInfraccion,
            Icon: FileText,
            cardClass: "",
            iconClass: "text-amber-700",
          },
          {
            label: "Responsable",
            value: causa.responsable || "Sin asignar",
            Icon: UserRound,
            cardClass: "",
            iconClass: "text-neutral-600",
          },
          {
            label: "Fase actual",
            value: summary.currentPhase,
            Icon: ClipboardList,
            cardClass: "",
            iconClass: "text-brand-700",
          },
          {
            label: "Última actualización",
            value: formatChileDate(causa.fechaUltimaActualizacion),
            Icon: CalendarClock,
            cardClass: "",
            iconClass: "text-brand-700",
          },
        ].map(({ label, value, Icon, cardClass, iconClass }) => (
          <div
            key={label}
            className={`min-w-0 px-4 py-3 ${cardClass}`}
            title={value}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <Icon
                className={`size-3.5 shrink-0 ${iconClass}`}
                aria-hidden="true"
              />
              <p className="truncate text-11px font-medium text-neutral-500">
                {label}
              </p>
            </div>
            <p className="mt-1 truncate text-xs font-semibold text-brand-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      {/* Antecedentes generales y Relato */}
      <section className="rounded-xl border border-neutral-150 bg-white p-4 shadow-xs sm:p-5">
        <h3 className="text-sm font-semibold text-brand-950">
          Antecedentes generales
        </h3>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-neutral-50 p-3">
            <dt className="text-xs font-medium text-neutral-500">Apertura</dt>
            <dd className="mt-0.5 font-semibold text-neutral-900">
              {formatChileDate(causa.fechaApertura)}
            </dd>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <dt className="text-xs font-medium text-neutral-500">
              Plazo de investigación
            </dt>
            <dd className="mt-0.5 font-semibold text-neutral-900">
              {maxDias} días {unidadPlazo}
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-3 rounded-lg bg-neutral-50 p-3.5">
          <div>
            <p className="text-xs font-semibold text-neutral-600">
              Descripción de la falta
            </p>
            <p className="mt-1 text-sm leading-6 text-neutral-700">
              {conductaDescripcion ||
                "No se ha asociado una conducta específica del RICE."}
            </p>
          </div>
          <div>
            {relatoLargo ? (
              <details>
                <summary className="cursor-pointer text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline">
                  Relato de los hechos · ver completo
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                  {causa.observaciones}
                </p>
              </details>
            ) : (
              <>
                <p className="text-xs font-semibold text-neutral-600">
                  Relato de los hechos
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                  {causa.observaciones ||
                    "Sin relato de los hechos registrado."}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Alertas Jurídicas si existen */}
      {breaches.length > 0 && (
        <section
          className="rounded-xl border border-gravisima-200 bg-gravisima-50 p-4 shadow-xs"
          role="alert"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gravisima-800">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Alertas jurídicas o procedimentales
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gravisima-800">
            {breaches.map((breach) => (
              <li key={breach}>{breach}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});
