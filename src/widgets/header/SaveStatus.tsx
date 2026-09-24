/** @license SPDX-License-Identifier: Apache-2.0 */

import { FileCheck, Loader2, AlertCircle } from "lucide-react";

interface SaveStatusProps {
  status: "idle" | "saving" | "saved" | "error";
  onRetry?: () => void;
}

const ICONS = {
  idle: null,
  saving: Loader2,
  saved: FileCheck,
  error: AlertCircle,
};

const COLORS = {
  idle: "text-neutral-400",
  saving: "text-brand-600 animate-spin",
  saved: "text-leve-600",
  error: "text-gravisima-600",
};

const LABELS = {
  idle: "",
  saving: "Guardando…",
  saved: "Guardado",
  error: "Error al guardar",
};

export default function SaveStatus({ status, onRetry }: SaveStatusProps) {
  const Icon = ICONS[status];
  if (!Icon) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold text-11px transition-colors ${COLORS[status]}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{LABELS[status]}</span>
      {status === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Reintentar sincronizaci�n"
          className="underline underline-offset-2 hover:text-gravisima-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-500"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
