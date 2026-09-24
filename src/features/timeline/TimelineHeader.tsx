/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Causa, UserRole } from "../../shared/lib/types";
import {
  AlertTriangle,
  CalendarClock,
  LockKeyhole,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  getCausaDeadlineStages,
  getCausaStatus,
} from "../causas/causaPresentation";
import { formatChileDate } from "../../shared/lib/dateTime";
import { getCausaOperationalPhase } from "../causas/causaOperationalSummary";
import { DetailModalHeader } from "../../shared/ui/DetailModal";

interface TimelineHeaderProps {
  causa: Causa;
  currentRole: UserRole;
  canDelete: boolean;
  privacyMode: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onForceCloseClick: () => void;
  onClose?: () => void;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  isTimelineCollapsed?: boolean;
  setIsTimelineCollapsed?: (collapsed: boolean) => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  onRetrySave?: () => void;
  breaches: string[];
}

export default function TimelineHeader({
  causa,
  currentRole,
  canDelete,
  privacyMode,
  onEditClick,
  onDeleteClick,
  onForceCloseClick,
  onClose,
  saveStatus = "idle",
  onRetrySave,
  breaches,
}: TimelineHeaderProps) {
  const canEdit = currentRole !== "docente";
  const deadlines = getCausaDeadlineStages(causa);
  const displayName = privacyMode
    ? causa.nnaProtectedName
    : causa.estudianteNombre;
  const currentPhase = getCausaOperationalPhase(causa);
  const riskLabel = breaches.length
    ? `${breaches.length} alerta${breaches.length === 1 ? "" : "s"}`
    : "Sin alertas";
  const deadlineChipClass = (tone: "normal" | "warning" | "overdue") =>
    ({
      normal: "border-leve-200 bg-leve-50 text-leve-700",
      warning: "border-grave-200 bg-grave-50 text-grave-700",
      overdue: "border-gravisima-200 bg-gravisima-50 text-gravisima-700",
    })[tone];

  return (
    <>
      <DetailModalHeader
        avatarInitial={displayName.charAt(0).toUpperCase()}
        avatarClassName={
          causa.comprometeAulaSegura
            ? "ring-gravisima-400"
            : causa.tipoInfraccion === "Leve"
              ? "ring-brand-200"
              : "ring-grave-400"
        }
        title={displayName}
        titleTooltip={displayName}
        metadata={
          <>
            <span className="inline-flex h-6 items-center rounded-full bg-neutral-100 px-2.5 text-xs font-medium text-neutral-700 leading-none">
              {causa.estudianteCurso || "Sin curso"}
            </span>
            <span className="inline-flex h-6 items-center rounded-full border border-neutral-200 bg-neutral-50 px-2.5 font-mono text-[11px] font-semibold text-neutral-700 leading-none">
              {causa.id}
            </span>
            <span
              className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold leading-none ${
                causa.comprometeAulaSegura
                  ? "border border-gravisima-200 bg-gravisima-100 text-gravisima-900"
                  : causa.tipoInfraccion === "Leve"
                    ? "border border-leve-200 bg-leve-100 text-leve-900"
                    : "border border-grave-200 bg-grave-100 text-grave-900"
              }`}
            >
              {causa.comprometeAulaSegura
                ? "Aula Segura"
                : causa.tipoInfraccion}
            </span>
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium text-neutral-700 leading-none">
              <span
                className="size-1.5 rounded-full bg-brand-600 shrink-0"
                aria-hidden="true"
              />
              {getCausaStatus(causa)} · {currentPhase}
            </span>
            <span
              className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold leading-none ${deadlineChipClass(deadlines.cierreIndagacion.tone)}`}
            >
              <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
              Cierre {formatChileDate(
                deadlines.cierreIndagacion.deadlineDate,
              )}{" "}
              · {deadlines.cierreIndagacion.text}
            </span>
            {breaches.length > 0 && (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-gravisima-200 bg-gravisima-100 px-2.5 text-xs font-semibold text-gravisima-800 leading-none">
                <AlertTriangle
                  className="size-3.5 shrink-0 text-gravisima-600"
                  aria-hidden="true"
                />
                {riskLabel}
              </span>
            )}
            {privacyMode && (
              <span
                className="inline-flex h-6 items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 text-[11px] font-medium text-neutral-600 leading-none"
                title="RUN e identidad protegidos"
              >
                <LockKeyhole
                  className="size-3 text-neutral-500 shrink-0"
                  aria-hidden="true"
                />
                NNA Protegido
              </span>
            )}
          </>
        }
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={onEditClick}
                  className="hidden sm:inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  title="Editar expediente"
                  aria-label="Editar expediente"
                >
                  <Pencil
                    className="size-3.5 text-neutral-500"
                    aria-hidden="true"
                  />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={onEditClick}
                  className="flex sm:hidden min-h-10 min-w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white p-2 text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  title="Editar expediente"
                  aria-label="Editar expediente"
                >
                  <Pencil
                    className="size-4 text-neutral-600"
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={onForceCloseClick}
                  className="hidden sm:inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gravisima-200 bg-gravisima-50 px-3 py-2 text-xs font-semibold text-gravisima-700 shadow-xs transition-colors hover:border-gravisima-300 hover:bg-gravisima-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  title="Cerrar causa con fundamento"
                  aria-label="Cerrar causa con fundamento"
                >
                  <LockKeyhole
                    className="size-3.5 text-gravisima-600"
                    aria-hidden="true"
                  />
                  <span>Cerrar causa</span>
                </button>
                <button
                  type="button"
                  onClick={onForceCloseClick}
                  className="flex sm:hidden min-h-10 min-w-10 items-center justify-center rounded-lg border border-gravisima-200 bg-gravisima-50 p-2 text-gravisima-700 transition-colors hover:bg-gravisima-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  title="Cerrar causa con fundamento"
                  aria-label="Cerrar causa con fundamento"
                >
                  <LockKeyhole className="size-4" aria-hidden="true" />
                </button>
              </>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDeleteClick}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-neutral-400 transition-colors hover:bg-gravisima-50 hover:text-gravisima-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                title="Eliminar expediente"
                aria-label="Eliminar expediente"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                title="Cerrar"
                aria-label="Cerrar"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            )}
          </div>
        }
      />

      {saveStatus === "error" && canEdit && onRetrySave && (
        <div
          role="alert"
          className="flex items-center gap-2 border-gravisima-200 border-b bg-gravisima-50 px-4 py-2.5 text-gravisima-800 text-xs sm:px-6"
        >
          <AlertTriangle
            className="size-4 shrink-0 text-gravisima-600"
            aria-hidden="true"
          />
          <span className="font-semibold">
            No se pudieron sincronizar los cambios. Revisa tu conexión.
          </span>
          <button
            type="button"
            onClick={onRetrySave}
            aria-label="Reintentar sincronización"
            className="ml-auto shrink-0 rounded-md bg-gravisima-600 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-gravisima-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Reintentar
          </button>
        </div>
      )}
      {breaches.length > 0 && (
        <div
          role="alert"
          className="border-gravisima-200 border-b bg-gravisima-50 px-4 py-2.5 text-gravisima-800 text-xs sm:px-6"
        >
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle
              className="size-4 text-gravisima-600"
              aria-hidden="true"
            />
            <span>Riesgos procedimentales</span>
          </div>
          <ul
            aria-label="Riesgos procedimentales detectados"
            className="list-disc space-y-0.5 pl-5"
          >
            {breaches.map((breach) => (
              <li key={breach}>{breach}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
