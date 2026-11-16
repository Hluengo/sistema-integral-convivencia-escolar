/** @license SPDX-License-Identifier: Apache-2.0 */

import { BarChart3, CheckCircle2 } from "lucide-react";
import type { TipoInfraccion } from "../../shared/lib/types";

const SEVERITY_CONFIG: Record<TipoInfraccion, { dot: string }> = {
  Leve: { dot: "bg-leve-500" },
  Grave: { dot: "bg-grave-500" },
  "Muy Grave": { dot: "bg-muygrave-500" },
  Gravísima: { dot: "bg-gravisima-500" },
};

function SeverityCard({
  tipo,
  count,
  total,
}: {
  tipo: TipoInfraccion;
  count: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const dot = SEVERITY_CONFIG[tipo].dot;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-2 text-neutral-700">
          <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
          {tipo.toUpperCase()}
        </span>
        <span className="text-neutral-500 tabular-nums">
          {count} de {total} ({percentage}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${dot}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function DashboardSeverityPanel({
  severity,
  total,
}: {
  severity: Record<TipoInfraccion, number>;
  total: number;
}) {
  const highSeverityPercentage =
    total > 0
      ? Math.round(((severity["Muy Grave"] + severity.Gravísima) / total) * 100)
      : 0;

  return (
    <section
      aria-labelledby="severity-title"
      className="card p-4 sm:p-5 lg:col-span-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-brand-600" aria-hidden="true" />
          <h2
            id="severity-title"
            className="font-bold text-neutral-900 text-sm"
          >
            Distribución por Gravedad
          </h2>
        </div>
        <span className="rounded-full bg-indigo-100 px-3 py-1 font-bold text-[11px] text-indigo-700">
          {total} Casos
        </span>
      </div>
      <p className="mt-1 text-neutral-500 text-xs leading-relaxed">
        Clasificación tipificada según Reglamento Interno de Convivencia Escolar
        (RICE).
      </p>
      <div className="mt-5 space-y-3.5">
        <SeverityCard tipo="Leve" count={severity.Leve} total={total} />
        <SeverityCard tipo="Grave" count={severity.Grave} total={total} />
        <SeverityCard
          tipo="Muy Grave"
          count={severity["Muy Grave"]}
          total={total}
        />
        <SeverityCard
          tipo="Gravísima"
          count={severity.Gravísima}
          total={total}
        />
      </div>
      <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 p-3">
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0 text-blue-700"
          aria-hidden="true"
        />
        <p className="text-blue-800 text-[11px] leading-tight">
          <strong>{highSeverityPercentage}%</strong> de los expedientes
          corresponden a faltas de alta ponderación formativa.
        </p>
      </div>
    </section>
  );
}
