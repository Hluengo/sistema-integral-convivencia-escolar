/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, GraduationCap, Scale, Search } from 'lucide-react';
import EmptyState from '../../../shared/EmptyState';
import { DetailModalSkeleton } from '../../../shared/Skeleton';
import ViewLoader from '../../../shared/ui/ViewLoader';
import { type Causa, type FaseProcedimental } from '../../../shared/lib/types';
import type { FormAction } from '../../../shared/lib/hooks/useNewCausaForm';
import Button from '@/src/shared/ui/Button';
import CausasTable from '../CausasTable';

const CausaDetailModal = lazy(() => import('../CausaDetailModal'));
const ClosedCases = lazy(() => import('../ClosedCases'));

interface CausasViewProps {
  causas: Causa[];
  selectedCausaId: string;
  selectedCausa: Causa | undefined;
  isCausaDetailLoading: boolean;
  selectedFaseFilter: FaseProcedimental | 'Todas';
  setSelectedFaseFilter: (fase: FaseProcedimental | 'Todas') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSelectedCausaId: (id: string) => void;
  privacyMode: boolean;
  mobileShowDetail: boolean;
  setMobileShowDetail: (v: boolean) => void;
  filteredCausas: Causa[];
  hasMoreCausas: boolean;
  isLoadingMoreCausas: boolean;
  onLoadMoreCausas: () => void;
  showCreateForm: boolean;
  dispatchForm: React.Dispatch<FormAction>;
  handleReopenCausa: (causa: Causa) => void;
  handleSelectCausaFromDashboard: (causaId: string) => void;
  handleOpenCreateForm: () => void;
}

export default function CausasView({
  causas,
  selectedCausaId,
  selectedCausa,
  isCausaDetailLoading,
  selectedFaseFilter,
  setSelectedFaseFilter,
  searchQuery,
  setSearchQuery,
  privacyMode,
  filteredCausas,
  hasMoreCausas,
  isLoadingMoreCausas,
  onLoadMoreCausas,
  showCreateForm,
  dispatchForm,
  handleReopenCausa,
  handleSelectCausaFromDashboard,
  handleOpenCreateForm,
  setSelectedCausaId,
}: CausasViewProps) {
  const [selectedCourse, setSelectedCourse] = useState('');
  const courseOptions = useMemo(
    () =>
      [...new Set(causas.map((causa) => causa.estudianteCurso).filter(Boolean))].sort(
        (left, right) => left.localeCompare(right, 'es-CL', { numeric: true, sensitivity: 'base' }),
      ),
    [causas],
  );
  const visibleCausas = useMemo(
    () =>
      selectedCourse
        ? filteredCausas.filter((causa) => causa.estudianteCurso === selectedCourse)
        : filteredCausas,
    [filteredCausas, selectedCourse],
  );
  const visibleAulaSeguraCount = visibleCausas.filter((causa) => causa.comprometeAulaSegura).length;

  const handleSelectCausa = useCallback(
    (cause: Causa) => {
      handleSelectCausaFromDashboard(cause.id);
    },
    [handleSelectCausaFromDashboard],
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
        <div
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 font-semibold text-blue-200/80 text-xs uppercase tracking-wider">
              Expedientes · Debido Proceso
            </p>
            <h2 className="font-bold text-2xl tracking-tight sm:text-3xl">Causas Activas</h2>
            <p className="mt-2 text-blue-100/80 text-sm">
              {visibleCausas.length} expediente{visibleCausas.length !== 1 ? 's' : ''} activo
              {visibleCausas.length !== 1 ? 's' : ''}
              {visibleAulaSeguraCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-lg bg-gravisima-500/30 px-2 py-0.5 font-semibold text-gravisima-100 text-xs">
                  {visibleAulaSeguraCount} Aula Segura
                </span>
              )}
            </p>
          </div>
          <Button
            variant="custom"
            onClick={() => dispatchForm({ type: showCreateForm ? 'CLOSE' : 'OPEN' })}
            className="shrink-0 rounded-xl bg-secondary-500 px-5 py-3 text-white shadow-md shadow-secondary-500/30 hover:bg-secondary-600 active:scale-[0.97]"
            aria-label="Crear nueva causa"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Nueva Causa
          </Button>
        </div>
      </div>

      {/* Search and course filter — matching Anotaciones */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            id="search-active-causes"
            placeholder="Buscar estudiante, RUT o curso..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Buscar expedientes"
            className="w-full rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-4 pl-10 font-medium text-neutral-800 text-sm transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="relative sm:w-72">
          <GraduationCap
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <select
            id="active-causes-course-filter"
            value={selectedCourse}
            onChange={(event) => {
              setSelectedCourse(event.target.value);
              setSelectedCausaId('');
            }}
            aria-label="Filtrar expedientes por curso"
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

      {/* Fase filter tabs — full-width, matching Anotaciones */}
      <div
        className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1"
        role="tablist"
        aria-label="Filtro por fase"
      >
        {(
          ['Todas', 'Recepción', 'Investigación', 'Resolución', 'Apelación', 'Seguimiento'] as const
        ).map((fase) => (
          <button
            key={fase}
            type="button"
            onClick={() => {
              setSelectedFaseFilter(fase);
              setSelectedCausaId('');
            }}
            role="tab"
            aria-selected={selectedFaseFilter === fase}
            className={`rounded-lg px-3.5 py-1.5 font-semibold text-sm transition-colors duration-150 ${
              selectedFaseFilter === fase
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            {fase}
          </button>
        ))}
      </div>

      {/* Table follows the same hierarchy as Anotaciones. */}
      {visibleCausas.length > 0 ? (
        <div className="space-y-3">
          <CausasTable
            causas={visibleCausas}
            privacyMode={privacyMode}
            onSelectCausa={handleSelectCausa}
          />
          {hasMoreCausas && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onLoadMoreCausas}
                disabled={isLoadingMoreCausas}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-brand-200 bg-white px-4 py-2 font-semibold text-brand-700 text-sm shadow-sm transition-colors hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoadingMoreCausas ? 'Cargando expedientes…' : 'Cargar más expedientes'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="card p-8">
            <EmptyState
              icon={Scale}
              title="Ningún expediente coincide"
              description={
                hasMoreCausas
                  ? 'Puede cargar más expedientes o intentar con otros filtros.'
                  : 'Intente con otros filtros o cree un nuevo expediente.'
              }
              action={
                causas.length === 0
                  ? { label: 'Crear primera causa', onClick: handleOpenCreateForm }
                  : undefined
              }
            />
          </div>
          {hasMoreCausas && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onLoadMoreCausas}
                disabled={isLoadingMoreCausas}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-brand-200 bg-white px-4 py-2 font-semibold text-brand-700 text-sm shadow-sm transition-colors hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoadingMoreCausas ? 'Cargando expedientes…' : 'Cargar más expedientes'}
              </button>
            </div>
          )}
        </div>
      )}

      <Suspense fallback={<DetailModalSkeleton />}>
        <CausaDetailModal
          causa={selectedCausa}
          privacyMode={privacyMode}
          isLoading={isCausaDetailLoading}
          onClose={() => setSelectedCausaId('')}
        />
      </Suspense>

      {/* VIEW 3: CLOSED CASES */}
      {selectedCausaId === '' && visibleCausas.length === 0 && (
        <div className="flex-1">
          <Suspense fallback={<ViewLoader view="causas" compact />}>
            <ClosedCases
              causas={causas}
              privacyMode={privacyMode}
              onReopenCausa={handleReopenCausa}
              onSelectCausa={(causa) => {
                handleSelectCausaFromDashboard(causa.id);
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
