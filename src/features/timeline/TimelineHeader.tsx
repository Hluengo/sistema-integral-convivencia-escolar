/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa, UserRole } from "../../shared/lib/types";
import { AlertTriangle, LockKeyhole, Pencil, Trash2, X } from "lucide-react";
import { getCausaStatus } from "../causas/causaPresentation";
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
  const displayName = privacyMode
    ? causa.nnaProtectedName
    : causa.estudianteNombre;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <>
      <DetailModalHeader
        avatarInitial={initials || "N"}
        avatarClassName="ring-brand-300"
        title={displayName}
        metadata={
          <>
            <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
              {causa.estudianteCurso || "Sin curso"}
            </span>
            <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-medium text-neutral-600">
              {causa.id}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-grave-200 bg-grave-50 px-2 py-0.5 font-semibold text-grave-700">
              <span className="size-1.5 rounded-full bg-grave-500" />
              {causa.comprometeAulaSegura
                ? "Aula Segura"
                : causa.tipoInfraccion}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-leve-200 bg-leve-50 px-2 py-0.5 font-medium text-leve-700">
              <span className="size-1.5 rounded-full bg-leve-500" />
              {getCausaStatus(causa)}
            </span>
            {privacyMode && (
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600">
                <LockKeyhole className="size-3" aria-hidden="true" />
                NNA protegido
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
                  onClick={onEditClick}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Editar expediente"
                >
                  <Pencil
                    className="size-3.5 text-neutral-500"
                    aria-hidden="true"
                  />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={onForceCloseClick}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gravisima-200 bg-gravisima-50/40 px-3 py-1.5 text-xs font-medium text-gravisima-600 shadow-sm transition hover:border-gravisima-300 hover:bg-gravisima-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-500"
                  aria-label="Cerrar causa"
                >
                  <LockKeyhole className="size-3.5" aria-hidden="true" />
                  Cerrar causa
                </button>
              </>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDeleteClick}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-neutral-400 transition hover:bg-gravisima-50 hover:text-gravisima-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-500"
                aria-label="Eliminar expediente"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Cerrar expediente"
                title="Cerrar expediente"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            )}
          </>
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
            className="ml-auto rounded-md bg-gravisima-600 px-3 py-1.5 font-semibold text-white hover:bg-gravisima-700"
            aria-label="Reintentar sincronización"
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
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle
              className="size-4 text-gravisima-600"
              aria-hidden="true"
            />{" "}
            Riesgos procedimentales
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {breaches.map((breach) => (
              <li key={breach}>{breach}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
