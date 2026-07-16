/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { type Causa, EstadoCausa } from '../types';
import { 
  Search, Archive, Clock, UserCheck, RotateCcw, CalendarDays, CheckCircle2,
  FileText, BarChart3, 
} from 'lucide-react';

interface ClosedCasesProps {
  causas: Causa[];
  privacyMode: boolean;
  onReopenCausa: (causa: Causa) => void;
  onSelectCausa: (causa: Causa) => void;
}

export default function ClosedCases({ 
  causas, 
  privacyMode, 
  onReopenCausa,
  onSelectCausa 
}: ClosedCasesProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'fecha' | 'nombre'>('fecha');

  // Filter only closed cases
  const closedCausas = causas.filter(c => c.estadoActual === EstadoCausa.CAUSA_CERRADA);

  // Apply search and sort
  const filteredCausas = closedCausas.filter(c => {
    if (!searchQuery.trim()) { return true; }
    const query = searchQuery.toLowerCase();
    return (
      c.estudianteNombre.toLowerCase().includes(query) ||
      c.nnaProtectedName.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.estudianteCurso.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    if (sortBy === 'fecha') {
      return new Date(b.fechaUltimaActualizacion).getTime() - new Date(a.fechaUltimaActualizacion).getTime();
    }
    return a.estudianteNombre.localeCompare(b.estudianteNombre);
  });

  if (closedCausas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 rounded-full bg-neutral-100 p-4">
          <Archive className="h-10 w-10 text-neutral-400" />
        </div>
        <h3 className="mb-1 font-semibold text-neutral-700 text-sm">No hay casos cerrados</h3>
        <p className="max-w-sm text-neutral-500 text-xs">
          Los expedientes que finalicen su proceso aparecerán aquí para su consulta y auditoría.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-base text-neutral-900">
            <Archive className="h-5 w-5 text-neutral-500" aria-hidden="true" />
            Casos Cerrados
          </h2>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            {closedCausas.length} expediente{closedCausas.length !== 1 ? 's' : ''} finalizado{closedCausas.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Stats mini-card */}
          <div className="hidden items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[10px] sm:flex">
            <div className="flex items-center gap-1.5 text-neutral-500">
              <BarChart3 className="h-3 w-3" />
              <span className="font-semibold text-neutral-700">{closedCausas.length}</span>
            </div>
            <div className="h-4 w-px bg-neutral-200" />
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Clock className="h-3 w-3" />
              <span className="font-semibold text-neutral-700">
                {closedCausas.reduce((acc, c) => {
                  const days = Math.round(
                    (new Date(c.fechaUltimaActualizacion).getTime() - new Date(c.fechaApertura).getTime()) 
                    / (1000 * 60 * 60 * 24)
                  );
                  return acc + days;
                }, 0)}d total
              </span>
            </div>
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'fecha' | 'nombre')}
            className="rounded-lg border border-neutral-200 bg-white p-1.5 font-medium text-[10px] text-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label="Ordenar por"
          >
            <option value="fecha">Más recientes</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
<input
  type="text"
  spellCheck={false}
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Buscar en casos cerrados..."
  className="w-full bg-white py-2 pr-4 pl-9 font-medium text-neutral-800 text-xs placeholder-neutral-400 focus:outline-none"
  aria-label="Buscar casos cerrados"
/>
      </div>

      {/* List of closed cases */}
      <div className="space-y-3">
        {filteredCausas.length > 0 ? (
          filteredCausas.map((causa) => {
            const duration = Math.round(
              (new Date(causa.fechaUltimaActualizacion).getTime() - new Date(causa.fechaApertura).getTime()) 
              / (1000 * 60 * 60 * 24)
            );
            const completedCount = causa.checklistDebidoProceso.filter(c => c.completado).length;
            const totalCount = causa.checklistDebidoProceso.length;

            return (
              <div
                key={causa.id}
                className="rounded-xl border border-neutral-200/80 bg-white transition-all hover:border-neutral-300 hover:shadow-sm"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Header row */}
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded border border-neutral-200/60 bg-neutral-50 px-2 py-0.5 font-mono font-semibold text-[10px] text-neutral-500">
                          {causa.id}
                        </span>
                        <span className="flex items-center gap-1 rounded-full border border-success-200 bg-success-100 px-1.5 py-0.5 font-semibold text-[8px] text-success-700">
                          <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                          Cerrado
                        </span>
                        <span className={`rounded px-1.5 py-0.5 font-bold text-[8px] ${
                          causa.tipoInfraccion === 'Gravísima' ? 'bg-red-100 text-red-800' :
                          causa.tipoInfraccion === 'Muy Grave' ? 'bg-purple-100 text-purple-800' :
                          causa.tipoInfraccion === 'Grave' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {causa.tipoInfraccion}
                        </span>
                      </div>

                      {/* Student info */}
                      <h3 className="font-bold text-neutral-900 text-sm">
                        {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}
                        <span className="ml-2 rounded border border-neutral-200/60 bg-neutral-50 px-1.5 py-0.5 align-middle font-medium text-[10px] text-neutral-400">
                          {causa.estudianteCurso}
                        </span>
                      </h3>

                      {/* Details */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-neutral-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-neutral-400" />
                          Abierto: {causa.fechaApertura}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-success-500" />
                          Cerrado: {causa.fechaUltimaActualizacion}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-neutral-400" />
                          Duración: {duration} días
                        </span>
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-neutral-400" />
                          {causa.responsable ? causa.responsable.split(' (')[0] : 'Sin responsable'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="max-w-xs flex-1">
                          <div className="mb-1 flex items-center justify-between text-[9px] text-neutral-400">
                            <span>Debido proceso</span>
                            <span className="font-semibold text-neutral-600">{completedCount}/{totalCount}</span>
                          </div>
<div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                            <div 
                              className="h-full rounded-full bg-success-500" 
                              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Context */}
                      <p className="mt-2 line-clamp-1 border-neutral-200 border-l-2 pl-2 text-[10px] text-neutral-500 italic leading-relaxed">
                        {causa.observaciones}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectCausa(causa)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 font-semibold text-[10px] text-white transition-all hover:bg-brand-700"
                        title="Ver detalle del caso"
                      >
                        <FileText className="h-3 w-3" aria-hidden="true" />
                        <span>Ver</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onReopenCausa(causa)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-[10px] text-amber-700 transition-all hover:bg-amber-100"
                        title="Reabrir caso"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        <span>Reabrir</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
            <Search className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
            <p className="font-medium text-neutral-500 text-xs">No se encontraron casos cerrados con ese criterio.</p>
          </div>
        )}
      </div>
    </div>
  );
}