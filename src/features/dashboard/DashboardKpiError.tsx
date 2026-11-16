/** @license SPDX-License-Identifier: Apache-2.0 */

import { AlertCircle } from "lucide-react";

export default function DashboardKpiError({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <AlertCircle
          className="h-5 w-5 shrink-0 text-gravisima-600"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-neutral-800 text-sm">
            Error al cargar los indicadores
          </p>
          <p className="text-neutral-600 text-xs">
            No se pudieron obtener las métricas del dashboard.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-4 font-semibold text-neutral-800 text-xs ring-1 ring-neutral-200 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        Reintentar
      </button>
    </div>
  );
}
