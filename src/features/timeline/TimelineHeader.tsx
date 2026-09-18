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
  getCausaPhase,
  getCausaStatus,
} from "../causas/causaPresentation";
import { formatChileDate } from "../../shared/lib/dateTime";
import { maskName, maskRut } from "../../shared/lib/anotacionesUtils";
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
  breaches,
}: TimelineHeaderProps) {
  const canEdit = currentRole !== "docente";
  const deadlines = getCausaDeadlineStages(causa);
  const displayName = privacyMode
    ? causa.nnaProtectedName
    : causa.estudianteNombre;
  const currentPhase = getCausaPhase(causa);
  const showConcluyente =
    deadlines.informeConcluyente !== null &&
    ["Resolución", "Apelación", "Seguimiento"].includes(currentPhase);
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
        title={displayName}
        metadata={
          <>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">
              {causa.estudianteCurso || "Sin curso"}
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-neutral-700">
              {causa.id}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${
                causa.comprometeAulaSegura
                  ? "bg-gravisima-100 text-neutral-900"
                  : "bg-grave-100 text-neutral-900"
              }`}
            >
              {causa.comprometeAulaSegura
                ? "Aula Segura"
                : causa.tipoInfraccion}
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">
              {getCausaStatus(causa)} · {currentPhase}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${deadlineChipClass(deadlines.cierreIndagacion.tone)}`}
            >
              <CalendarClock className="size-3" aria-hidden="true" />
              Cierre {formatChileDate(
                deadlines.cierreIndagacion.deadlineDate,
              )}{" "}
              · {deadlines.cierreIndagacion.text}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                breaches.length
                  ? "bg-gravisima-100 text-gravisima-800"
                  : "bg-leve-100 text-neutral-800"
              }`}
            >
              {riskLabel}
            </span>
            {showConcluyente && deadlines.informeConcluyente && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${deadlineChipClass(deadlines.informeConcluyente.tone)}`}
              >
                Concluyente: {deadlines.informeConcluyente.text}
              </span>
            )}
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
              Apertura {formatChileDate(causa.fechaApertura)}
            </span>
            {causa.runEstudiante && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-neutral-600"
                title={privacyMode ? "RUN protegido" : undefined}
              >
                RUN{" "}
                {privacyMode
                  ? maskRut(causa.runEstudiante, true)
                  : causa.runEstudiante}
              </span>
            )}
            {!causa.runEstudiante && privacyMode && (
              <span
                className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-neutral-600"
                title="RUN protegido"
              >
                RUN {maskRut(undefined, true)} · {maskName(displayName, true)}
              </span>
            )}
          </>
        }
        actions={
          <>
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={onForceCloseClick}
                  className="hidden items-center gap-1.5 rounded-md bg-gravisima-600 px-3 py-2 font-semibold text-white text-xs shadow-sm transition-colors hover:bg-gravisima-700 sm:inline-flex"
                  title="Cerrar causa con fundamento"
                  aria-label="Cerrar causa con fundamento"
                >
                  <LockKeyhole className="size-4" aria-hidden="true" />
                  Cerrar causa
                </button>
                <button
                  type="button"
                  onClick={onForceCloseClick}
                  className="flex min-h-10 min-w-10 items-center justify-center rounded-md bg-gravisima-50 p-2 text-gravisima-700 transition-colors hover:bg-gravisima-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:hidden"
                  title="Cerrar causa con fundamento"
                  aria-label="Cerrar causa con fundamento"
                >
                  <LockKeyhole className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onEditClick}
                  className="flex min-h-10 min-w-10 items-center justify-center rounded-md bg-neutral-100 p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  title="Editar expediente"
                  aria-label="Editar expediente"
                >
                  <Pencil className="size-5" aria-hidden="true" />
                </button>
              </>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDeleteClick}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-gravisima-600 transition-colors hover:bg-gravisima-50 hover:text-gravisima-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                title="Eliminar expediente"
                aria-label="Eliminar expediente"
              >
                <Trash2 className="size-5" aria-hidden="true" />
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
          </>
        }
      />

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
