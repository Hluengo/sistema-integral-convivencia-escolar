/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  AlertTriangle,
  FileQuestion,
  FileText,
  FileWarning,
  Info,
} from "lucide-react";
import type { AnnotationStageCounts } from "../../shared/lib/domain/annotationStageCounts";
import { AnnotationStageCard } from "../anotaciones/AnnotationStageCard";

export default function DashboardMeasuresPanel({
  counts,
}: {
  counts: AnnotationStageCounts;
}) {
  const totalStudents =
    counts.sinCarta.total +
    counts.amonestacion.total +
    counts.compromiso.total +
    counts.derivacion.total;
  const pendingStudents =
    counts.amonestacion.pending +
    counts.compromiso.pending +
    counts.derivacion.pending;

  return (
    <section
      aria-labelledby="measures-title"
      className="card p-3 sm:p-5 lg:col-span-8"
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-brand-600" aria-hidden="true" />
          <h2
            id="measures-title"
            className="font-bold text-neutral-900 text-sm"
          >
            Estado de Medidas y Cartas Disciplinarias
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-neutral-700 text-xs tabular-nums">
            {totalStudents} alumnos · {pendingStudents} por gestionar
          </span>
          <span className="inline-flex items-center gap-1 text-brand-600 text-xs">
            <Info className="size-3.5" aria-hidden="true" />
            Flujo de intervención gradual
          </span>
        </div>
      </div>
      <p className="mt-1 text-neutral-500 text-xs">
        Seguimiento en línea según volumen de anotaciones negativas registradas
        por estudiante.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AnnotationStageCard
          label="Sin Carta"
          counts={counts.sinCarta}
          threshold="1-4 anotaciones"
          icon={FileQuestion}
          iconBg="bg-neutral-50"
          iconColor="text-neutral-600"
          accentColor="#64748b"
        />
        <AnnotationStageCard
          label="Amonestación"
          counts={counts.amonestacion}
          threshold="5-9 anotaciones"
          icon={FileText}
          iconBg="bg-grave-50"
          iconColor="text-grave-600"
          accentColor="#f59e0b"
        />
        <AnnotationStageCard
          label="Compromiso"
          counts={counts.compromiso}
          threshold="10-14 anotaciones"
          icon={FileWarning}
          iconBg="bg-muygrave-50"
          iconColor="text-muygrave-600"
          accentColor="#f97316"
        />
        <AnnotationStageCard
          label="Derivación"
          counts={counts.derivacion}
          threshold="15+ anotaciones"
          icon={AlertTriangle}
          iconBg="bg-gravisima-50"
          iconColor="text-gravisima-600"
          accentColor="#ef4444"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-slate-100 border-t pt-3 text-neutral-600 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-gravisima-500" />
          <strong className="text-neutral-800">Pendientes:</strong> requieren
          redactar y gestionar firma.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-brand-600" />
          <strong className="text-neutral-800">Procesadas:</strong> impresas en
          inspectoría / citación apoderado.
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-neutral-400" />
          <strong className="text-neutral-800">Archivadas:</strong> firmadas y
          cargadas en ficha del alumno.
        </span>
      </div>
    </section>
  );
}
