/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Causa, EstadoCausa } from '../types';
import { getFaseForEstado } from '../data';
import { 
  Search, Archive, Clock, Shield, User, UserCheck, 
  ChevronRight, RotateCcw, CalendarDays, CheckCircle2,
  FileText, AlertTriangle, BarChart3, Filter
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
    if (!searchQuery.trim()) return true;
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
        <div className="bg-neutral-100 p-4 rounded-full mb-4">
          <Archive className="h-10 w-10 text-neutral-400" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-700 mb-1">No hay casos cerrados</h3>
        <p className="text-xs text-neutral-500 max-w-sm">
          Los expedientes que finalicen su proceso aparecerán aquí para su consulta y auditoría.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
            <Archive className="h-5 w-5 text-neutral-500" aria-hidden="true" />
            Casos Cerrados
          </h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {closedCausas.length} expediente{closedCausas.length !== 1 ? 's' : ''} finalizado{closedCausas.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Stats mini-card */}
          <div className="hidden sm:flex bg-white border border-neutral-200 rounded-lg px-3 py-1.5 items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1.5 text-neutral-500">
              <BarChart3 className="h-3 w-3" />
              <span className="font-semibold text-neutral-700">{closedCausas.length}</span>
            </div>
            <div className="w-px h-4 bg-neutral-200" />
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
            className="text-[10px] border border-neutral-200 rounded-lg p-1.5 bg-white font-medium text-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label="Ordenar por"
          >
            <option value="fecha">Más recientes</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
<input
  type="text"
  spellCheck={false}
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="Buscar en casos cerrados..."
  className="w-full bg-white text-neutral-800 pl-9 pr-4 py-2 text-xs font-medium placeholder-neutral-400 focus:outline-none"
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
                className="bg-white border border-neutral-200/80 rounded-xl hover:border-neutral-300 hover:shadow-sm transition-all"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Header row */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-[10px] font-mono font-semibold text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200/60">
                          {causa.id}
                        </span>
                        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-success-100 text-success-700 border border-success-200 flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                          Cerrado
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          causa.tipoInfraccion === 'Gravísima' ? 'bg-red-100 text-red-800' :
                          causa.tipoInfraccion === 'Muy Grave' ? 'bg-purple-100 text-purple-800' :
                          causa.tipoInfraccion === 'Grave' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {causa.tipoInfraccion}
                        </span>
                      </div>

                      {/* Student info */}
                      <h3 className="text-sm font-bold text-neutral-900">
                        {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}
                        <span className="ml-2 text-[10px] font-medium text-neutral-400 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200/60 align-middle">
                          {causa.estudianteCurso}
                        </span>
                      </h3>

                      {/* Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] text-neutral-500">
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
                        <div className="flex-1 max-w-xs">
                          <div className="flex items-center justify-between text-[9px] text-neutral-400 mb-1">
                            <span>Debido proceso</span>
                            <span className="font-semibold text-neutral-600">{completedCount}/{totalCount}</span>
                          </div>
<div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-success-500 h-full rounded-full" 
                              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Context */}
                      <p className="mt-2 text-[10px] text-neutral-500 leading-relaxed line-clamp-1 border-l-2 border-neutral-200 pl-2 italic">
                        {causa.observaciones}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectCausa(causa)}
                        className="text-[10px] font-semibold bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Ver detalle del caso"
                      >
                        <FileText className="h-3 w-3" aria-hidden="true" />
                        <span>Ver</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onReopenCausa(causa)}
                        className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-all flex items-center gap-1.5 cursor-pointer"
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
          <div className="bg-white p-8 text-center rounded-xl border border-neutral-200">
            <Search className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-500 font-medium">No se encontraron casos cerrados con ese criterio.</p>
          </div>
        )}
      </div>
    </div>
  );
}