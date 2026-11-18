/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertTriangle,
  BarChart3,
  FileQuestion,
  FileText,
  FileWarning,
} from "lucide-react";
import type { AnnotationStageCounts } from "../../shared/lib/domain/annotationStageCounts";
import { AnnotationStageCard } from "./AnnotationStageCard";

export default function DashboardStageOverview({
  counts,
}: {
  counts: AnnotationStageCounts;
}) {
  return (
    <section
      aria-labelledby="annotation-dashboard-title"
      className="card p-3 sm:p-5"
    >
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-neutral-100 p-1.5">
          <BarChart3
            className="h-3.5 w-3.5 text-neutral-500"
            aria-hidden="true"
          />
        </div>
        <h2
          id="annotation-dashboard-title"
          className="font-semibold text-neutral-800 text-sm"
        >
          Estado de medidas y cartas disciplinarias
        </h2>
      </div>
      <div className="mt-3 grid grid-cols-1 divide-y divide-neutral-200 border border-neutral-200 sm:mt-4 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
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
          label="Carta de Amonestación"
          counts={counts.amonestacion}
          threshold="5-9 anotaciones"
          icon={FileText}
          iconBg="bg-grave-50"
          iconColor="text-grave-600"
          accentColor="#f59e0b"
        />
        <AnnotationStageCard
          label="Carta de Compromiso"
          counts={counts.compromiso}
          threshold="10-14 anotaciones"
          icon={FileWarning}
          iconBg="bg-muygrave-50"
          iconColor="text-muygrave-600"
          accentColor="#f97316"
        />
        <AnnotationStageCard
          label="Derivación a Convivencia"
          counts={counts.derivacion}
          threshold="15+ anotaciones"
          icon={AlertTriangle}
          iconBg="bg-gravisima-50"
          iconColor="text-gravisima-600"
          accentColor="#ef4444"
        />
      </div>
      <p className="mt-3 text-neutral-500 text-xs leading-relaxed">
        <span className="font-semibold text-grave-700">Pendientes:</span>{" "}
        requieren gestionar la carta o derivación.
        <span className="mx-2 text-neutral-200" aria-hidden="true">
          ·
        </span>
        <span className="font-semibold text-leve-700">Procesadas:</span> carta
        impresa y disponible para firma.
        <span className="mx-2 text-neutral-200" aria-hidden="true">
          ·
        </span>
        <span className="font-semibold text-neutral-700">Archivadas:</span>{" "}
        carta firmada por apoderado.
      </p>
    </section>
  );
}
