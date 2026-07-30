/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo, useMemo, useState } from 'react';
import { ChevronDown, Clock, GraduationCap, Search, Shield, ChevronRight } from 'lucide-react';
import { type Causa, type FaseProcedimental, type TipoInfraccion } from '../../types';

function getFaseFromEstado(estado: string): FaseProcedimental {
  const faseMap: Record<string, FaseProcedimental> = {
    'Recepción de Denuncia': 'Recepción',
    'Revisión Inicial de Antecedentes': 'Recepción',
    'Notificación de Inicio de Indagación': 'Recepción',
    'En Proceso de Indagación': 'Investigación',
    'Recopilación de Evidencias en Curso': 'Investigación',
    'Derivado a Mediación': 'Investigación',
    'Mediación en Desarrollo': 'Investigación',
    'Mediación Cerrada con Acuerdo': 'Investigación',
    'Mediación Fracasada – Retorno a Indagación': 'Investigación',
    'Informe Cierre de Indagación en Elaboración': 'Resolución',
    'Informe Cierre de Indagación Emitido': 'Resolución',
    'Entrevista Disciplinaria Pendiente': 'Resolución',
    'Entrevista Disciplinaria Realizada': 'Resolución',
    'Informe Concluyente en Elaboración': 'Resolución',
    'Informe Concluyente Emitido': 'Resolución',
    'En Plazo de Apelación': 'Apelación',
    'Apelación Recepcionada': 'Apelación',
    'Apelación en Revisión por Rectoría': 'Apelación',
    'Apelación Resuelta': 'Apelación',
    'Resolución Ejecutoriada': 'Apelación',
    'Medida en Ejecución': 'Seguimiento',
    'En Proceso de Seguimiento': 'Seguimiento',
    'Seguimiento Finalizado': 'Seguimiento',
    'Causa Cerrada': 'Seguimiento',
  };
  return faseMap[estado] || 'Recepción';
}

function getEstadoSimplificado(estado: string): string {
  if (estado === 'Causa Cerrada') return 'Cerrada';
  if (estado === 'Resolución Ejecutoriada') return 'Resolución ejecutoriada';
  if (estado === 'En Plazo de Apelación') return 'En plazo de apelación';
  return 'Activa';
}

function getTipoInfraccionBadge(tipo: TipoInfraccion): string {
  const badges: Record<TipoInfraccion, string> = {
    Leve: 'bg-emerald-100 text-emerald-800',
    Grave: 'bg-amber-100 text-amber-800',
    'Muy Grave': 'bg-rose-100 text-rose-800',
    Gravísima: 'bg-red-100 text-red-800',
  };
  return badges[tipo] || 'bg-neutral-100 text-neutral-800';
}

function getDiasParaCierre(causa: Causa): { text: string; color: string } {
  if (!causa.fechaApertura) return { text: '—', color: 'text-neutral-400' };
  const apertura = new Date(causa.fechaApertura + 'T00:00:00-03:00');
  const now = new Date();
  const diffMs = now.getTime() - apertura.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const plazoMax = causa.comprometeAulaSegura ? 10 : 60;
  const restantes = plazoMax - diffDays;

  if (restantes < 0) return { text: 'Plazo excedido', color: 'text-red-600 font-semibold' };
  if (restantes === 0) return { text: 'Vence hoy', color: 'text-amber-600 font-semibold' };
  if (restantes <= 5) return { text: `${restantes} días`, color: 'text-amber-600 font-semibold' };
  return { text: `${restantes} días`, color: 'text-neutral-600' };
}

interface CausasTableProps {
  causas: Causa[];
  privacyMode: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFase: FaseProcedimental | 'Todas';
  setActiveFase: (fase: FaseProcedimental | 'Todas') => void;
  onSelectCausa: (causa: Causa) => void;
  isLoading: boolean;
}

export default memo(function CausasTable({
  causas,
  privacyMode,
  searchQuery,
  setSearchQuery,
  activeFase,
  setActiveFase,
  onSelectCausa,
  isLoading,
}: CausasTableProps) {
  const [selectedCourse, setSelectedCourse] = useState('');

  const courseOptions = useMemo(
    () =>
      [...new Set(causas.map((c) => c.estudianteCurso).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'es-CL', { numeric: true, sensitivity: 'base' }),
      ),
    [causas],
  );

  const filteredCausas = useMemo(() => {
    let filtered = causas;

    if (activeFase !== 'Todas') {
      filtered = filtered.filter((c) => getFaseFromEstado(c.estadoActual) === activeFase);
    }

    if (selectedCourse) {
      filtered = filtered.filter((c) => c.estudianteCurso === selectedCourse);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.estudianteNombre.toLowerCase().includes(q) ||
          c.runEstudiante?.toLowerCase().includes(q) ||
          c.estudianteCurso?.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.responsable?.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [causas, activeFase, selectedCourse, searchQuery]);

  const FASE_FILTERS = [
    'Todas',
    'Recepción',
    'Investigación',
    'Resolución',
    'Apelación',
    'Seguimiento',
  ] as const;

  return (
    <div className="space-y-4">
      {/* Search and course filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            id="search-causas"
            placeholder="Buscar estudiante, RUT, curso o expediente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar expedientes"
            className="w-full rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-4 pl-10 font-medium text-neutral-800 text-sm transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="relative sm:w-56">
          <GraduationCap
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <select
            id="causas-course-filter"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            aria-label="Filtrar por curso"
            className="w-full appearance-none rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-9 pl-10 font-medium text-neutral-800 text-sm transition-colors hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Todos los cursos</option>
            {courseOptions.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Phase filter tabs */}
      <div
        className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1"
        role="tablist"
        aria-label="Filtro por fase"
      >
        {FASE_FILTERS.map((fase) => (
          <button
            key={fase}
            type="button"
            onClick={() => setActiveFase(fase)}
            role="tab"
            aria-selected={activeFase === fase}
            className={`rounded-lg px-3.5 py-1.5 font-semibold text-sm transition-colors duration-150 ${
              activeFase === fase
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {fase}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-neutral-200/60 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider">
                  Estudiante
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider sm:table-cell">
                  Curso
                </th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider">
                  Expediente
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider md:table-cell">
                  Tipificación
                </th>
                <th className="hidden px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider lg:table-cell">
                  Fase
                </th>
                <th className="hidden px-4 py-3 text-center font-semibold text-neutral-600 text-xs uppercase tracking-wider lg:table-cell">
                  Días para cierre
                </th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600 text-xs uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600 text-xs uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
                        aria-hidden="true"
                      />
                      Cargando expedientes...
                    </div>
                  </td>
                </tr>
              ) : filteredCausas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500 text-sm">
                    No se encontraron expedientes con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredCausas.map((causa) => {
                  const fase = getFaseFromEstado(causa.estadoActual);
                  const estadoSimplificado = getEstadoSimplificado(causa.estadoActual);
                  const badge = getTipoInfraccionBadge(causa.tipoInfraccion);
                  const dias = getDiasParaCierre(causa);

                  const isClosed = causa.estadoActual === 'Causa Cerrada';

                  return (
                    <tr
                      key={causa.id}
                      onClick={() => !isClosed && onSelectCausa(causa)}
                      onKeyDown={(e) => {
                        if (!isClosed && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onSelectCausa(causa);
                        }
                      }}
                      tabIndex={isClosed ? -1 : 0}
                      role={isClosed ? undefined : 'button'}
                      aria-label={
                        isClosed
                          ? `Expediente cerrado ${causa.id}`
                          : `Gestionar expediente ${causa.id}`
                      }
                      className={`transition-colors ${
                        isClosed ? 'opacity-60' : 'cursor-pointer hover:bg-brand-50/50'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-900">
                            {privacyMode ? causa.nnaProtectedName : causa.estudianteNombre}
                          </span>
                          {!privacyMode && causa.runEstudiante && (
                            <span className="hidden font-mono text-neutral-400 text-xs lg:inline">
                              {causa.runEstudiante}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-neutral-600 text-sm sm:table-cell">
                        {causa.estudianteCurso || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span className="font-mono font-semibold text-brand-700">{causa.id}</span>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-sm md:table-cell">
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold text-xs ${badge}`}
                          >
                            {causa.tipoInfraccion}
                          </span>
                          {causa.comprometeAulaSegura && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-[10px] text-red-700"
                              title="Aula Segura"
                            >
                              <Shield className="size-3" aria-hidden="true" />
                              Aula Segura
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-sm lg:table-cell">
                        <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 font-medium text-neutral-700 text-xs">
                          {fase}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-center text-sm lg:table-cell">
                        <span
                          className={`inline-flex items-center justify-center gap-1 ${dias.color}`}
                        >
                          <Clock className="size-3.5" aria-hidden="true" />
                          {dias.text}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${
                            isClosed
                              ? 'bg-neutral-100 text-neutral-500'
                              : estadoSimplificado === 'Activa'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {estadoSimplificado}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        {!isClosed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCausa(causa);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-semibold text-brand-700 text-xs transition-colors hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                            aria-label={`Gestionar ${causa.id}`}
                          >
                            Gestionar
                            <ChevronRight className="size-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-neutral-500 text-sm">
          Mostrando <span className="font-medium text-neutral-700">{filteredCausas.length}</span> de{' '}
          <span className="font-medium text-neutral-700">{causas.length}</span> expedientes
        </p>
      </div>
    </div>
  );
});
