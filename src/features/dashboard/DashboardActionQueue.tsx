/** @license SPDX-License-Identifier: Apache-2.0 */

import { ArrowRight, Clock3 } from "lucide-react";
import type { DashboardAction } from "./dashboardActions";

export default function DashboardActionQueue({
  actions,
  privacyMode,
  onOpen,
  onViewAll,
}: {
  actions: DashboardAction[];
  privacyMode: boolean;
  onOpen?: (causaId: string) => void;
  onViewAll?: () => void;
}) {
  if (actions.length === 0) {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm text-neutral-600">
        <Clock3 className="size-4 text-leve-600" aria-hidden="true" />
        No hay plazos operativos vencidos o próximos a vencer.
      </div>
    );
  }

  return (
    <section
      aria-labelledby="dashboard-action-queue-title"
      className="rounded-xl border border-gravisima-200/80 border-l-4 border-l-gravisima-500 bg-white p-3 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2
            id="dashboard-action-queue-title"
            className="font-semibold text-neutral-900"
          >
            Acciones prioritarias
          </h2>
          <p className="mt-1 text-neutral-500 text-xs">
            Expedientes que requieren atención por plazo.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-gravisima-50 px-2.5 py-1 font-bold text-gravisima-700 text-xs">
            {actions.length}
          </span>
          {onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-brand-700 text-xs hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Ver todos
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="divide-y divide-neutral-100">
        {actions.slice(0, 5).map((action) => (
          <div
            key={action.causa.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-neutral-900 text-sm">
                {privacyMode
                  ? action.causa.nnaProtectedName
                  : action.causa.estudianteNombre}
              </p>
              <p className="truncate text-neutral-500 text-xs">
                {action.causa.id} · {action.causa.estudianteCurso} ·{" "}
                {action.causa.responsable}
              </p>
            </div>
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(action.causa.id)}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 py-1.5 font-semibold text-brand-700 text-xs hover:bg-brand-50"
                aria-label={`Abrir expediente ${action.causa.id}`}
              >
                <span
                  className={
                    action.urgency === "overdue"
                      ? "text-gravisima-700"
                      : "text-grave-700"
                  }
                >
                  {action.label}
                </span>
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            ) : (
              <span className="shrink-0 font-semibold text-gravisima-700 text-xs">
                {action.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
