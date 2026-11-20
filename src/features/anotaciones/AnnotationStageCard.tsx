/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ComponentType } from "react";
import type { AnnotationStageBreakdown } from "../../shared/lib/domain/annotationStageCounts";

interface AnnotationStageCardProps {
  label: string;
  threshold: string;
  counts: AnnotationStageBreakdown;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  accentColor: string;
}

export function AnnotationStageCard({
  label,
  threshold,
  counts,
  icon: Icon,
  iconBg,
  iconColor,
  accentColor,
}: AnnotationStageCardProps) {
  const workflowTotal = counts.pending + counts.processed + counts.archived;
  const hasWorkflow = workflowTotal > 0;
  // Sin Carta con desglose en cero: es seguimiento preventivo, no un trámite de firma.
  const showWorkflow = hasWorkflow || label !== "Sin Carta";
  const pendingShare =
    showWorkflow && counts.total > 0
      ? Math.round((counts.pending / counts.total) * 100)
      : 0;
  const processedShare =
    showWorkflow && counts.total > 0
      ? Math.round((counts.processed / counts.total) * 100)
      : 0;
  const archivedShare =
    showWorkflow && counts.total > 0
      ? Math.max(0, 100 - pendingShare - processedShare)
      : 0;
  const needsAction = counts.pending > 0 && label !== "Sin Carta";

  return (
    <article
      aria-label={`${label}: ${counts.total} alumnos${needsAction ? `, ${counts.pending} por gestionar` : ""}`}
      className={`card flex min-h-[170px] flex-col justify-between border-t-[3px] p-3 ${needsAction ? "ring-1 ring-gravisima-200" : ""}`}
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-neutral-800 text-xs">{label}</h4>
          <span
            className={`flex size-7 items-center justify-center rounded-lg ${iconBg}`}
          >
            <Icon className={`size-4 ${iconColor}`} aria-hidden="true" />
          </span>
        </div>
        <p className="mt-1 text-neutral-500 text-11px">{threshold}</p>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1 gap-y-1">
          <p className="font-extrabold text-2xl text-neutral-900 leading-none tabular-nums">
            {counts.total}
          </p>
          <p className="text-neutral-500 text-11px">alumnos</p>
          {needsAction ? (
            <span className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-gravisima-50 px-1.5 py-0.5 font-bold text-gravisima-700 text-11px tabular-nums">
              {counts.pending} por gestionar
            </span>
          ) : null}
        </div>
        {showWorkflow ? (
          <div
            className="mt-2.5 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`Pendientes ${pendingShare}%, procesadas ${processedShare}%, archivadas ${archivedShare}%`}
          >
            <span
              className="h-full bg-gravisima-500"
              style={{ width: `${pendingShare}%` }}
            />
            <span
              className="h-full bg-brand-600"
              style={{ width: `${processedShare}%` }}
            />
            <span
              className="h-full bg-neutral-400"
              style={{ width: `${archivedShare}%` }}
            />
          </div>
        ) : null}
      </div>
      {showWorkflow ? (
        <dl className="mt-2.5 grid grid-cols-3 gap-1 border-slate-200/70 border-t pt-2.5 text-center text-11px">
          <div title="Cartas pendientes: requieren redactar y gestionar firma">
            <dt className="text-neutral-500">Pend.</dt>
            <dd className="font-bold text-gravisima-600 tabular-nums">
              {counts.pending}
            </dd>
          </div>
          <div title="Cartas procesadas: impresas en inspectoría / citación apoderado">
            <dt className="text-neutral-500">Proc.</dt>
            <dd className="font-bold text-brand-700 tabular-nums">
              {counts.processed}
            </dd>
          </div>
          <div title="Cartas archivadas: firmadas y cargadas en ficha del alumno">
            <dt className="text-neutral-500">Arch.</dt>
            <dd className="font-bold text-neutral-700 tabular-nums">
              {counts.archived}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2.5 rounded-lg bg-slate-50 px-2.5 py-2 text-neutral-500 text-11px leading-snug">
          Seguimiento preventivo · sin trámite de firma requerido.
        </p>
      )}
    </article>
  );
}
