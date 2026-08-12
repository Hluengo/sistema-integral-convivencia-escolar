/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Causa, UserRole } from '../../shared/lib/types';
import { AlertTriangle, CalendarClock, LockKeyhole, Pencil, Trash2, X } from 'lucide-react';
import { getCausaDeadline, getCausaStatus } from '../causas/causaPresentation';
import { formatChileDate } from '../../shared/lib/dateTime';
import { DetailModalHeader } from '../../shared/ui/DetailModal';

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
  const canEdit = currentRole !== 'docente';
  const deadline = getCausaDeadline(causa);
  const displayName = privacyMode ? causa.nnaProtectedName : causa.estudianteNombre;

  return (
    <>
      <DetailModalHeader
        avatarInitial={displayName.charAt(0).toUpperCase()}
        title={displayName}
        metadata={
          <>
            <span>{causa.estudianteCurso || 'Sin curso'}</span>
            <span className="font-mono">{causa.id}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${
                causa.comprometeAulaSegura
                  ? 'bg-gravisima-100 text-gravisima-700'
                  : 'bg-grave-100 text-grave-700'
              }`}
            >
              {causa.comprometeAulaSegura ? 'Aula Segura' : causa.tipoInfraccion}
            </span>
            <span>{getCausaStatus(causa)}</span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {deadline.text}
            </span>
            <span>Apertura: {formatChileDate(causa.fechaApertura)}</span>
          </>
        }
        actions={
          <>
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={onForceCloseClick}
                  className="hidden items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-gravisima-100 text-xs transition-colors hover:bg-gravisima-500/20 hover:text-white sm:inline-flex"
                  title="Cerrar causa con fundamento"
                  aria-label="Cerrar causa con fundamento"
                >
                  <LockKeyhole className="size-4" aria-hidden="true" />
                  Cerrar causa
                </button>
                <button
                  type="button"
                  onClick={onForceCloseClick}
                  className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-gravisima-100 transition-colors hover:bg-gravisima-500/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800 sm:hidden"
                  title="Cerrar causa con fundamento"
                  aria-label="Cerrar causa con fundamento"
                >
                  <LockKeyhole className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onEditClick}
                  className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-neutral-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800"
                  title="Editar expediente"
                  aria-label="Editar expediente"
                >
                  <Pencil className="size-5" aria-hidden="true" />
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={onDeleteClick}
                    className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-neutral-200 transition-colors hover:bg-gravisima-500/20 hover:text-gravisima-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gravisima-200 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800"
                    title="Eliminar expediente"
                    aria-label="Eliminar expediente"
                  >
                    <Trash2 className="size-5" aria-hidden="true" />
                  </button>
                )}
              </>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-neutral-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-800"
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
          className="border-danger-200 border-b bg-danger-50 px-4 py-2.5 text-danger-800 text-xs sm:px-6"
        >
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-4 text-danger-600" aria-hidden="true" />
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
