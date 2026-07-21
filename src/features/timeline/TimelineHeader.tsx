/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Causa, UserRole } from '../../types';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Minimize2,
  AlertTriangle,
  Pencil,
  Trash2,
} from 'lucide-react';

interface TimelineHeaderProps {
  causa: Causa;
  currentRole: UserRole;
  privacyMode: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: (collapsed: boolean) => void;
  isTimelineCollapsed?: boolean;
  setIsTimelineCollapsed?: (collapsed: boolean) => void;
  breaches: string[];
}

export default function TimelineHeader({
  causa,
  currentRole,
  privacyMode,
  onEditClick,
  onDeleteClick,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isTimelineCollapsed: _isTimelineCollapsed,
  setIsTimelineCollapsed,
  breaches,
}: TimelineHeaderProps) {
  const canEdit = currentRole !== 'docente';

  return (
    <>
      {/* Title Header area */}
      <div className="relative overflow-hidden bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 p-5 text-white sm:p-6">
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 rounded-lg bg-white/20 px-2.5 py-0.5 font-mono font-semibold text-[10px] text-white ring-1 ring-white/20 backdrop-blur-sm">
                {causa.id}
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 font-medium text-[10px] text-blue-100/80 ring-1 ring-white/10">
                <Calendar className="h-3 w-3" aria-hidden="true" /> Apertura: {causa.fechaApertura}
              </span>

              {/* Layout controls */}
              {setIsSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={`flex cursor-pointer select-none items-center gap-1 rounded-lg border px-2 py-1 font-semibold text-xs transition-colors ${
                    isSidebarCollapsed
                      ? 'border-brand-700 bg-brand-600 text-white hover:bg-brand-700'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                  title={isSidebarCollapsed ? 'Mostrar lista de causas' : 'Ocultar lista de causas'}
                  aria-label={
                    isSidebarCollapsed
                      ? 'Mostrar panel de lista de causas'
                      : 'Ocultar panel de lista de causas'
                  }
                  aria-pressed={!isSidebarCollapsed}
                >
                  {isSidebarCollapsed ? (
                    <>
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      <span className="hidden sm:inline">Lista</span>
                    </>
                  ) : (
                    <>
                      <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                      <span className="hidden sm:inline">Lista</span>
                    </>
                  )}
                </button>
              )}

              {setIsTimelineCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsTimelineCollapsed(true)}
                  className="flex cursor-pointer select-none items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 font-semibold text-neutral-600 text-xs transition-colors hover:bg-neutral-50"
                  title="Cerrar detalle del expediente"
                  aria-label="Cerrar vista detallada"
                >
                  <Minimize2 className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">Cerrar</span>
                </button>
              )}

              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={onEditClick}
                    className="flex cursor-pointer select-none items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 font-semibold text-neutral-600 text-xs transition-colors hover:bg-neutral-50"
                    title="Editar expediente"
                    aria-label="Editar expediente"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteClick}
                    className="flex cursor-pointer select-none items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1 font-semibold text-red-600 text-xs transition-colors hover:bg-red-50"
                    title="Eliminar expediente"
                    aria-label="Eliminar expediente"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </button>
                </>
              )}
            </div>
            <h2 className="font-bold font-display text-lg text-white tracking-tight sm:text-xl">
              {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}
              <span className="ml-2 rounded-lg bg-white/10 px-2 py-0.5 align-middle font-medium text-blue-100/70 text-xs ring-1 ring-white/10">
                {causa.estudianteCurso}
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 font-medium text-blue-100/80 text-xs">
              <span>
                Gravedad:{' '}
                <strong
                  className={`font-semibold ${
                    causa.tipoInfraccion === 'Gravísima'
                      ? 'text-red-200'
                      : causa.tipoInfraccion === 'Muy Grave'
                        ? 'text-purple-200'
                        : causa.tipoInfraccion === 'Grave'
                          ? 'text-amber-200'
                          : 'text-blue-200'
                  }`}
                >
                  {causa.tipoInfraccion}
                </strong>
              </span>
              <span className="text-white/30" aria-hidden="true">
                •
              </span>
              <span>
                Responsable:{' '}
                <strong className="font-semibold text-white">
                  {causa.responsable.split(' (')[0]}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Due Process Breach Alerts pane */}
      {breaches.length > 0 && (
        <div
          role="alert"
          className="border-danger-200 border-b bg-danger-50 px-4 py-2.5 text-danger-800 text-xs sm:px-5"
        >
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4 text-danger-600" aria-hidden="true" />
            <span>RIESGOS PROCEDIMENTALES:</span>
          </div>
          <ul
            aria-label="Riesgos procedimentales detectados"
            className="list-disc space-y-0.5 pl-5 text-xs"
          >
            {breaches.map((b) => (
              <li key={`breach-${b.length}-${b.charCodeAt(0) || 0}`} className="font-medium">
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
