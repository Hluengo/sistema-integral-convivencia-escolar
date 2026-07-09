/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Causa, UserRole } from '../../types';
import { Calendar, ChevronRight, ChevronLeft, Minimize2, AlertTriangle, Pencil, Trash2 } from 'lucide-react';

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
  isTimelineCollapsed,
  setIsTimelineCollapsed,
  breaches
}: TimelineHeaderProps) {
  const canEdit = currentRole !== 'docente';

  return (
    <>
      {/* Title Header area */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-5 sm:p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" aria-hidden="true" />
        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono bg-white/20 backdrop-blur-sm text-white font-semibold px-2.5 py-0.5 rounded-lg shrink-0 ring-1 ring-white/20">
                {causa.id}
              </span>
              <span className="text-[10px] font-medium text-blue-100/80 bg-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1 ring-1 ring-white/10">
                <Calendar className="h-3 w-3" aria-hidden="true" /> Apertura: {causa.fechaApertura}
              </span>

              {/* Layout controls */}
              {setIsSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer select-none ${
                    isSidebarCollapsed
                      ? 'bg-brand-600 text-white border-brand-700 hover:bg-brand-700'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                  }`}
                  title={isSidebarCollapsed ? "Mostrar lista de causas" : "Ocultar lista de causas"}
                  aria-label={isSidebarCollapsed ? "Mostrar panel de lista de causas" : "Ocultar panel de lista de causas"}
                >
                  {isSidebarCollapsed ? (
                    <><ChevronRight className="h-3 w-3" aria-hidden="true" /><span className="hidden sm:inline">Lista</span></>
                  ) : (
                    <><ChevronLeft className="h-3 w-3" aria-hidden="true" /><span className="hidden sm:inline">Lista</span></>
                  )}
                </button>
              )}

              {setIsTimelineCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsTimelineCollapsed(true)}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg border bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 flex items-center gap-1 transition-all cursor-pointer select-none"
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
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg border bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 flex items-center gap-1 transition-all cursor-pointer select-none"
                    title="Editar expediente"
                    aria-label="Editar expediente"
                  >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteClick}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg border bg-white border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1 transition-all cursor-pointer select-none"
                    title="Eliminar expediente"
                    aria-label="Eliminar expediente"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </button>
                </>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
              {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre} 
              <span className="ml-2 text-xs font-medium text-blue-100/70 bg-white/10 px-2 py-0.5 rounded-lg align-middle ring-1 ring-white/10">
                {causa.estudianteCurso}
              </span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-100/80 font-medium">
              <span>Gravedad: <strong className={`font-semibold ${
                causa.tipoInfraccion === 'Gravísima' ? 'text-red-200' :
                causa.tipoInfraccion === 'Muy Grave' ? 'text-purple-200' :
                causa.tipoInfraccion === 'Grave' ? 'text-amber-200' :
                'text-blue-200'
              }`}>{causa.tipoInfraccion}</strong></span>
              <span className="text-white/30" aria-hidden="true">•</span>
              <span>Responsable: <strong className="text-white font-semibold">{causa.responsable.split(' (')[0]}</strong></span>
            </div>
          </div>

        </div>
      </div>

      {/* Due Process Breach Alerts pane */}
      {breaches.length > 0 && (
        <div className="bg-danger-50 border-b border-danger-200 px-4 sm:px-5 py-2.5 text-[11px] text-danger-800">
          <div className="flex items-center gap-1.5 font-semibold mb-1">
            <AlertTriangle className="h-4 w-4 text-danger-600" aria-hidden="true" />
            <span>RIESGOS PROCEDIMENTALES:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
            {breaches.map((b) => <li key={b} className="font-medium">{b}</li>)}
          </ul>
        </div>
      )}
    </>
  );
}
