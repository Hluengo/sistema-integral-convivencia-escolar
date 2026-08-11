/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, GraduationCap, Scale, Search } from 'lucide-react';
import EmptyState from '../../../shared/EmptyState';
import { DetailModalSkeleton } from '../../../shared/Skeleton';
import ViewLoader from '../../../shared/ui/ViewLoader';
import type { Causa } from '../../../shared/lib/types';
import { useCausasStore } from '../../../shared/lib/stores/causasStore';
import { useUIStore } from '../../../shared/lib/stores/uiStore';
import Button from '@/shared/ui/Button';
import PageHeader from '@/shared/ui/PageHeader';
import CausasTable from '../CausasTable';
import type {
  CausaWorkspaceViewModel,
  CreateCausaActions,
  MainNavigationActions,
} from './viewContracts';

const CausaDetailModal = lazy(() => import('../CausaDetailModal'));
const ClosedCases = lazy(() => import('../ClosedCases'));

interface CausasViewProps {
  workspace: CausaWorkspaceViewModel;
  createCausa: CreateCausaActions;
  navigation: MainNavigationActions;
}

export default function CausasView({ workspace, createCausa, navigation }: CausasViewProps) {
  const { onNavigate, onSelectCausaFromDashboard } = navigation;
  const { setSelectedCausaId } = workspace;
  const selectedFaseFilter = useCausasStore((state) => state.selectedFaseFilter);
  const setSelectedFaseFilter = useCausasStore((state) => state.setSelectedFaseFilter);
  const searchQuery = useCausasStore((state) => state.searchQuery);
  const setSearchQuery = useCausasStore((state) => state.setSearchQuery);
  const privacyMode = useUIStore((state) => state.privacyMode);
  const [selectedCourse, setSelectedCourse] = useState('');
  const courseOptions = useMemo(
    () =>
      [...new Set(workspace.causas.map((causa) => causa.estudianteCurso).filter(Boolean))].sort(
        (left, right) => left.localeCompare(right, 'es-CL', { numeric: true, sensitivity: 'base' }),
      ),
    [workspace.causas],
  );
  const visibleCausas = useMemo(
    () =>
      selectedCourse
        ? workspace.filteredCausas.filter((causa) => causa.estudianteCurso === selectedCourse)
        : workspace.filteredCausas,
    [workspace.filteredCausas, selectedCourse],
  );
  const visibleAulaSeguraCount = visibleCausas.filter((causa) => causa.comprometeAulaSegura).length;

  const handleSelectCausa = useCallback(
    (cause: Causa) => {
      onSelectCausaFromDashboard(cause.id);
    },
    [onSelectCausaFromDashboard],
  );
  const clearSelectedCausa = useCallback(() => {
    setSelectedCausaId('');
    onNavigate('causas');
  }, [onNavigate, setSelectedCausaId]);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Expedientes · Debido Proceso"
        title="Causas activas"
        description={`${visibleCausas.length} expediente${visibleCausas.length !== 1 ? 's' : ''} activo${visibleCausas.length !== 1 ? 's' : ''}`}
        metric={
          visibleAulaSeguraCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-gravisima-50 px-2.5 py-1 font-semibold text-gravisima-700 text-xs">
              {visibleAulaSeguraCount} Aula Segura
            </span>
          ) : null
        }
        action={
          <Button
            onClick={createCausa.onToggle}
            className="shrink-0"
            aria-label="Crear nueva causa"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Nueva Causa
          </Button>
        }
      />

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
              clearSelectedCausa();
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
              clearSelectedCausa();
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
      {workspace.isCausasLoading ? (
        <ViewLoader view="causas" compact />
      ) : visibleCausas.length > 0 ? (
        <div className="space-y-3">
          <CausasTable
            causas={visibleCausas}
            privacyMode={privacyMode}
            onSelectCausa={handleSelectCausa}
          />
          {workspace.hasMoreCausas && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={workspace.onLoadMoreCausas}
                disabled={workspace.isLoadingMoreCausas}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-brand-200 bg-white px-4 py-2 font-semibold text-brand-700 text-sm shadow-sm transition-colors hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
              >
                {workspace.isLoadingMoreCausas ? 'Cargando expedientes…' : 'Cargar más expedientes'}
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
                workspace.hasMoreCausas
                  ? 'Puede cargar más expedientes o intentar con otros filtros.'
                  : 'Intente con otros filtros o cree un nuevo expediente.'
              }
              action={
                workspace.causas.length === 0
                  ? { label: 'Crear primera causa', onClick: createCausa.onOpen }
                  : undefined
              }
            />
          </div>
          {workspace.hasMoreCausas && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={workspace.onLoadMoreCausas}
                disabled={workspace.isLoadingMoreCausas}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-brand-200 bg-white px-4 py-2 font-semibold text-brand-700 text-sm shadow-sm transition-colors hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
              >
                {workspace.isLoadingMoreCausas ? 'Cargando expedientes…' : 'Cargar más expedientes'}
              </button>
            </div>
          )}
        </div>
      )}

      <Suspense fallback={<DetailModalSkeleton />}>
        <CausaDetailModal
          causa={workspace.selectedCausa ?? undefined}
          privacyMode={privacyMode}
          isLoading={workspace.isCausaDetailLoading}
          onClose={clearSelectedCausa}
        />
      </Suspense>

      {/* VIEW 3: CLOSED CASES */}
      {!workspace.isCausasLoading &&
        workspace.selectedCausaId === '' &&
        visibleCausas.length === 0 && (
          <div className="flex-1">
            <Suspense fallback={<ViewLoader view="causas" compact />}>
              <ClosedCases
                causas={workspace.causas}
                privacyMode={privacyMode}
                onReopenCausa={navigation.onReopenCausa}
                onSelectCausa={(causa) => {
                  navigation.onSelectCausaFromDashboard(causa.id);
                }}
              />
            </Suspense>
          </div>
        )}
    </div>
  );
}
