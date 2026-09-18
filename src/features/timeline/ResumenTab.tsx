/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderArchive,
  UserRound,
} from "lucide-react";
import type { Causa } from "../../shared/lib/types";
import {
  extractConductaFromObservation,
  getConductaReglamentada,
} from "../../reglamentoData";
import {
  getCausaDeadlineStages,
  getCausaStatus,
} from "../causas/causaPresentation";
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
  const deadlines = getCausaDeadlineStages(causa);
  const summary = getCausaOperationalSummary(causa);
  const completed = summary.completedHitos;
  const totalHitos = causa.checklistDebidoProceso.length;
  const currentProgress = summary.currentPhaseProgress;
  const phasePct = currentProgress.total
    ? Math.round((currentProgress.completed / currentProgress.total) * 100)
    : 0;
  const nextAction = summary.nextChecklistItem
    ? `${summary.nextChecklistPhase}: ${summary.nextChecklistItem.label}`
    : "Sin hito pendiente en la ruta visible";
  const conductaDescripcion =
    getConductaReglamentada(causa.conductaRiceId)?.conducta ||
    extractConductaFromObservation(causa.observaciones);

  return (
    <div className="space-y-4">
      {causa.incidenteId && (
        <IncidentePanel causa={causa} privacyMode={privacyMode} />
      )}

      <section className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,19rem)]">
        <div className="rounded-lg border border-neutral-150 bg-white p-3 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-11px font-semibold uppercase text-neutral-500">
                Centro operativo del expediente
              </p>
              <h3 className="mt-0.5 text-base font-bold leading-tight text-brand-950">
                {summary.currentPhase}
              </h3>
              <p
                className="mt-1 truncate text-xs leading-5 text-neutral-600"
                title={nextAction}
              >
                {nextAction}
              </p>
            </div>
            <span
              className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-11px font-bold ${
                breaches.length
                  ? "bg-gravisima-100 text-gravisima-800"
                  : "bg-leve-100 text-neutral-800"
              }`}
            >
              {breaches.length ? (
                <AlertTriangle className="size-3" />
              ) : (
                <CheckCircle2 className="size-3" />
              )}
              {breaches.length
                ? `${breaches.length} alerta${breaches.length === 1 ? "" : "s"}`
                : "Sin alertas"}
            </span>
          </div>

          <div className="mt-2.5">
            <div className="flex items-center justify-between gap-3 text-11px text-neutral-600">
              <span>Avance de fase</span>
              <span className="font-semibold text-neutral-900">
                {currentProgress.completed}/{currentProgress.total} · {phasePct}
                %
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100"
              role="progressbar"
              aria-label={`Avance de fase ${summary.currentPhase}`}
              aria-valuenow={currentProgress.completed}
              aria-valuemin={0}
              aria-valuemax={Math.max(currentProgress.total, 1)}
              aria-valuetext={`${currentProgress.completed} de ${currentProgress.total} hitos, ${phasePct} por ciento`}
            >
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${phasePct}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-150 bg-white shadow-xs">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <CalendarClock
              className="size-4 shrink-0 text-grave-600"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-11px text-neutral-600">Cierre de indagación</p>
              <p className="truncate text-xs font-semibold text-neutral-900">
                {formatChileDate(deadlines.cierreIndagacion.deadlineDate)} ·{" "}
                {deadlines.cierreIndagacion.text}
              </p>
            </div>
            {deadlines.informeConcluyente && (
              <span
                className="ml-auto shrink-0 text-right text-10px text-neutral-500"
                title={`Concluyente: ${deadlines.informeConcluyente.text}`}
              >
                Concluyente
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <FolderArchive
              className="size-4 shrink-0 text-brand-700"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-11px text-neutral-600">Trazabilidad</p>
              <p className="truncate text-xs font-semibold text-neutral-900">
                {completed}/{totalHitos} hitos · {summary.documentsCount} docs
              </p>
            </div>
            <span className="ml-auto shrink-0 text-right text-10px text-neutral-500">
              {summary.historyCount} historial
            </span>
          </div>
        </div>
      </section>

      <section
        aria-label="Datos del expediente"
        className="card grid overflow-hidden sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-neutral-200"
      >
        {[
          {
            label: "Estado actual",
            value: getCausaStatus(causa),
            Icon: CheckCircle2,
            cardClass: "",
            iconClass: "text-leve-700",
          },
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
            value: causa.responsable,
            Icon: UserRound,
            cardClass: "",
            iconClass: "text-neutral-600",
          },
          {
            label: "Última actualización",
            value: formatChileDate(causa.fechaUltimaActualizacion),
            Icon: ClipboardList,
            cardClass: "",
            iconClass: "text-brand-700",
          },
        ].map(({ label, value, Icon, cardClass, iconClass }) => (
          <div
            key={label}
            className={`min-w-0 px-3 py-2 ${cardClass}`}
            title={value}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <Icon
                className={`size-3.5 shrink-0 ${iconClass}`}
                aria-hidden="true"
              />
              <p className="truncate text-11px text-neutral-500">{label}</p>
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-brand-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-neutral-150 bg-white p-4 shadow-xs">
        <h3 className="text-sm font-semibold text-brand-950">
          Antecedentes generales
        </h3>
        <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Apertura</dt>
            <dd className="font-medium text-neutral-900">
              {formatChileDate(causa.fechaApertura)}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Fase operativa</dt>
            <dd className="font-medium text-neutral-900">
              {summary.currentPhase}
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-3 rounded-lg bg-neutral-50 p-3">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              Descripción de la falta
            </p>
            <p className="mt-1 text-sm leading-6 text-neutral-700">
              {conductaDescripcion ||
                "No se ha asociado una conducta específica del RICE."}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-neutral-500">
              Relato de los hechos
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
              {causa.observaciones || "Sin relato de los hechos registrado."}
            </p>
          </div>
        </div>
      </section>

      {breaches.length > 0 && (
        <section
          className="rounded-lg border border-gravisima-200 bg-gravisima-50 p-4"
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
