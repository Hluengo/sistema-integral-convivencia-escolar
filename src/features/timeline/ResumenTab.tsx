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
import EstadoProcedimental from "../causas/matriz/EstadoProcedimental";

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

      <EstadoProcedimental causa={causa} />

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div className="rounded-lg border border-neutral-150 bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-neutral-500">
                Centro operativo del expediente
              </p>
              <h3 className="mt-1 text-xl font-bold leading-tight text-brand-950">
                {summary.currentPhase}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
                {nextAction}
              </p>
            </div>
            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                breaches.length
                  ? "bg-danger-100 text-danger-800"
                  : "bg-leve-100 text-neutral-800"
              }`}
            >
              {breaches.length ? (
                <AlertTriangle className="size-3.5" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {breaches.length
                ? `${breaches.length} alerta${breaches.length === 1 ? "" : "s"}`
                : "Sin alertas"}
            </span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs text-neutral-600">
              <span>Avance de fase</span>
              <span className="font-semibold text-neutral-900">
                {currentProgress.completed}/{currentProgress.total} · {phasePct}
                %
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-lg border border-neutral-150 border-t-2 border-t-grave-500 bg-white p-4 shadow-xs">
            <CalendarClock
              className="size-5 text-grave-600"
              aria-hidden="true"
            />
            <p className="mt-3 text-neutral-600 text-xs">
              Cierre de indagación
            </p>
            <p className="mt-1 font-semibold text-neutral-900">
              {formatChileDate(deadlines.cierreIndagacion.deadlineDate)} ·{" "}
              {deadlines.cierreIndagacion.text}
            </p>
            {deadlines.informeConcluyente && (
              <p className="mt-1 text-neutral-600 text-xs">
                Concluyente: {deadlines.informeConcluyente.text}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-neutral-150 bg-white p-4 shadow-xs">
            <FolderArchive
              className="size-5 text-brand-700"
              aria-hidden="true"
            />
            <p className="mt-3 text-neutral-600 text-xs">Trazabilidad</p>
            <p className="mt-1 font-semibold text-neutral-900">
              {completed}/{totalHitos} hitos · {summary.documentsCount}{" "}
              documentos
            </p>
            <p className="mt-1 text-neutral-600 text-xs">
              {summary.historyCount} registros en historial
            </p>
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
            cardClass: "border-t-2 border-t-leve-500",
            iconClass: "text-leve-700",
          },
          {
            label: "Tipificación",
            value: causa.comprometeAulaSegura
              ? "Aula Segura"
              : causa.tipoInfraccion,
            Icon: FileText,
            cardClass: "border-t-2 border-t-amber-500",
            iconClass: "text-amber-700",
          },
          {
            label: "Responsable",
            value: causa.responsable,
            Icon: UserRound,
            cardClass: "border-t-2 border-t-neutral-300",
            iconClass: "text-neutral-600",
          },
          {
            label: "Última actualización",
            value: formatChileDate(causa.fechaUltimaActualizacion),
            Icon: ClipboardList,
            cardClass: "border-t-2 border-t-brand-500",
            iconClass: "text-brand-700",
          },
        ].map(({ label, value, Icon, cardClass, iconClass }) => (
          <div key={label} className={`p-4 ${cardClass}`}>
            <Icon className={`mb-2 size-5 ${iconClass}`} aria-hidden="true" />
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-1 text-sm font-semibold text-brand-950">{value}</p>
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
          className="rounded-lg border border-danger-200 bg-danger-50 p-4"
          role="alert"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-danger-800">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Alertas jurídicas o procedimentales
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-danger-800">
            {breaches.map((breach) => (
              <li key={breach}>{breach}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});
