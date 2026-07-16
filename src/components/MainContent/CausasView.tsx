/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Suspense, lazy, useCallback } from 'react';
import { BookOpen, Scale } from 'lucide-react';
import EmptyState from '../EmptyState';
import { CausaCardSkeleton } from '../Skeleton';
import { type Causa, EstadoCausa, type FaseProcedimental } from '../../types';
import type { FormAction } from '../../hooks/useNewCausaForm';

const CausaCard = lazy(() => import('../CausaCard'));
const InteractiveTimeline = lazy(() => import('../InteractiveTimeline'));
const ClosedCases = lazy(() => import('../ClosedCases'));

function ViewFallback() {
  return (
    <div className="animate-pulse space-y-3 p-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <CausaCardSkeleton key={'sk-' + i} />
      ))}
    </div>
  );
}

interface CausasViewProps {
  causas: Causa[];
  selectedCausaId: string;
  selectedCausa: Causa | undefined;
  selectedFaseFilter: FaseProcedimental | 'Todas';
  setSelectedFaseFilter: (fase: FaseProcedimental | 'Todas') => void;
  setSelectedCausaId: (id: string) => void;
  privacyMode: boolean;
  mobileShowDetail: boolean;
  setMobileShowDetail: (v: boolean) => void;
  filteredCausas: Causa[];
  aulaSeguraCausas: Causa[];
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
  selectedFaseFilter,
  setSelectedFaseFilter,
  privacyMode,
  mobileShowDetail,
  setMobileShowDetail,
  filteredCausas,
  aulaSeguraCausas,
  showCreateForm,
  dispatchForm,
  handleReopenCausa,
  handleSelectCausaFromDashboard,
  handleOpenCreateForm,
  setSelectedCausaId,
}: CausasViewProps) {
  const handleSelectCausa = useCallback(
    (cause: Causa) => {
      handleSelectCausaFromDashboard(cause.id);
    },
    [handleSelectCausaFromDashboard]
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
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
              {filteredCausas.length} expediente{filteredCausas.length !== 1 ? 's' : ''} activo
              {filteredCausas.length !== 1 ? 's' : ''}
              {aulaSeguraCausas.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-lg bg-red-500/30 px-2 py-0.5 font-semibold text-red-100 text-xs">
                  {aulaSeguraCausas.length} Aula Segura
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatchForm({ type: showCreateForm ? 'CLOSE' : 'OPEN' })}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-secondary-500 px-5 py-3 font-semibold text-white shadow-md shadow-secondary-500/30 transition-all hover:bg-secondary-600 active:scale-[0.97]"
            aria-label="Crear nueva causa"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Nueva Causa
          </button>
        </div>
      </div>

      {/* Mobile tab switcher */}
      {selectedCausa && selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA && (
        <div
          className="flex gap-2 rounded-xl bg-neutral-100 p-1 lg:hidden"
          role="tablist"
          aria-label="Vista móvil"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!mobileShowDetail}
            onClick={() => setMobileShowDetail(false)}
            className={`flex-1 rounded-lg py-2 font-semibold text-xs transition-all ${
              !mobileShowDetail
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileShowDetail}
            onClick={() => setMobileShowDetail(true)}
            className={`flex-1 rounded-lg py-2 font-semibold text-xs transition-all ${
              mobileShowDetail
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Detalle
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div
          className={`space-y-4 transition-all duration-300 lg:col-span-5 ${
            mobileShowDetail &&
            selectedCausa &&
            selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA
              ? 'hidden lg:block'
              : 'block'
          }`}
        >
          <div className="card relative space-y-4 p-5">
            <div
              className="absolute top-0 right-4 left-4 h-[3px] rounded-full bg-brand-600"
              aria-hidden="true"
            />
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-brand-50 p-2">
                <BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="font-bold text-neutral-900 text-sm">Expedientes</h3>
                <span className="font-medium text-neutral-400 text-xs">
                  {filteredCausas.length} resultados
                </span>
              </div>
            </div>

            {/* Fase filter pills */}
            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtro por fase">
              {(
                [
                  'Todas',
                  'Recepción',
                  'Investigación',
                  'Resolución',
                  'Apelación',
                  'Seguimiento',
                ] as const
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
                  className={`cursor-pointer rounded-xl border px-3 py-2 font-semibold text-xs transition-all duration-200 ${
                    selectedFaseFilter === fase
                      ? fase === 'Todas'
                        ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                        : 'border-brand-600 bg-brand-600 text-white shadow-brand-600/20 shadow-sm'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-800'
                  }`}
                >
                  {fase}
                </button>
              ))}
            </div>
          </div>

          {/* Directory scroll panel */}
          <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
            {filteredCausas.length > 0 ? (
              <Suspense fallback={<ViewFallback />}>
                {filteredCausas.map((c) => (
                  <CausaCard
                    key={c.id}
                    causa={c}
                    privacyMode={privacyMode}
                    onSelect={handleSelectCausa}
                    isSelected={c.id === selectedCausaId}
                  />
                ))}
              </Suspense>
            ) : (
              <div className="card p-8">
                <EmptyState
                  icon={Scale}
                  title="Ningún expediente coincide"
                  description="Intente con otros filtros o cree un nuevo expediente."
                  action={
                    causas.length === 0
                      ? { label: 'Crear primera causa', onClick: handleOpenCreateForm }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div
          className={`h-full transition-all duration-300 lg:col-span-7 ${
            mobileShowDetail &&
            selectedCausa &&
            selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA
              ? 'block'
              : 'hidden lg:block'
          }`}
        >
          {selectedCausa && selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA ? (
            <Suspense fallback={<ViewFallback />}>
              <InteractiveTimeline
                key={selectedCausa.id}
                causa={selectedCausa}
                isSidebarCollapsed={false}
                setIsSidebarCollapsed={undefined}
                isTimelineCollapsed={false}
                setIsTimelineCollapsed={undefined}
              />
            </Suspense>
          ) : (
            <div className="card p-8">
              <EmptyState
                icon={BookOpen}
                title="Seleccione un expediente activo"
                description="Elija una causa de la lista para ver su timeline y gestionar el debido proceso"
              />
            </div>
          )}
        </div>
      </div>

      {/* VIEW 3: CLOSED CASES */}
      {selectedCausaId === '' && filteredCausas.length === 0 && (
        <div className="flex-1">
          <ClosedCases
            causas={causas}
            privacyMode={privacyMode}
            onReopenCausa={handleReopenCausa}
            onSelectCausa={(causa) => {
              handleSelectCausaFromDashboard(causa.id);
            }}
          />
        </div>
      )}
    </div>
  );
}
