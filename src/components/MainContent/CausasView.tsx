/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BookOpen, Scale } from 'lucide-react';
import { Causa, EstadoCausa, UserRole, FaseProcedimental } from '../../types';
import type { FormAction } from '../../hooks/useNewCausaForm';

const CausaCard = lazy(() => import('../CausaCard'));
const InteractiveTimeline = lazy(() => import('../InteractiveTimeline'));
const ClosedCases = lazy(() => import('../ClosedCases'));

function ViewFallback() {
  return (
    <div className="card p-8 text-sm text-neutral-500">
      Cargando vista...
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
  currentRole: UserRole;
  privacyMode: boolean;
  mobileShowDetail: boolean;
  setMobileShowDetail: (v: boolean) => void;
  filteredCausas: Causa[];
  aulaSeguraCausas: Causa[];
  showCreateForm: boolean;
  dispatchForm: React.Dispatch<FormAction>;
  handleUpdateCausa: (updated: Causa) => void;
  handleDeleteCausa: (id: string) => void;
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
  currentRole,
  privacyMode,
  mobileShowDetail,
  setMobileShowDetail,
  filteredCausas,
  aulaSeguraCausas,
  showCreateForm,
  dispatchForm,
  handleUpdateCausa,
  handleDeleteCausa,
  handleReopenCausa,
  handleSelectCausaFromDashboard,
  handleOpenCreateForm,
  setSelectedCausaId,
}: CausasViewProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-blue-200/80 text-xs font-semibold uppercase tracking-wider mb-1">
              Expedientes · Debido Proceso
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Causas Activas</h2>
            <p className="text-blue-100/80 text-sm mt-2">
              {filteredCausas.length} expediente{filteredCausas.length !== 1 ? 's' : ''} activo{filteredCausas.length !== 1 ? 's' : ''}
              {aulaSeguraCausas.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 bg-red-500/30 px-2 py-0.5 rounded-lg text-red-100 text-xs font-semibold">
                  {aulaSeguraCausas.length} Aula Segura
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatchForm({ type: showCreateForm ? 'CLOSE' : 'OPEN' })}
            className="inline-flex items-center justify-center gap-2 bg-secondary-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-secondary-600 active:scale-[0.97] transition-all shadow-md shadow-secondary-500/30 shrink-0"
            aria-label="Crear nueva causa"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Nueva Causa
          </button>
        </div>
      </div>

      {/* Mobile tab switcher */}
      {selectedCausa && selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA && (
        <div className="flex lg:hidden gap-2 bg-neutral-100 p-1 rounded-xl" role="tablist" aria-label="Vista móvil">
          <button
            type="button"
            role="tab"
            aria-selected={!mobileShowDetail}
            onClick={() => setMobileShowDetail(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !mobileShowDetail ? 'bg-white shadow-sm text-neutral-800' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileShowDetail}
            onClick={() => setMobileShowDetail(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mobileShowDetail ? 'bg-brand-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Detalle
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column */}
        <div className={`lg:col-span-5 space-y-4 transition-all duration-300 ${
          mobileShowDetail && selectedCausa && selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA ? 'hidden lg:block' : 'block'
        }`}>
          <div className="relative card p-5 space-y-4">
            <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-brand-600" aria-hidden="true" />
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-50">
                  <BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">Expedientes</h3>
                  <span className="text-[11px] text-neutral-400 font-medium">{filteredCausas.length} resultados</span>
                </div>
              </div>

              {/* Fase filter pills */}
              <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtro por fase">
                {(['Todas', 'Recepción', 'Investigación', 'Resolución', 'Apelación', 'Seguimiento'] as const).map((fase) => (
                  <button
                    key={fase}
                    type="button"
                    onClick={() => {
                      setSelectedFaseFilter(fase);
                      setSelectedCausaId('');
                    }}
                    role="tab"
                    aria-selected={selectedFaseFilter === fase}
                    className={`px-3 py-2 text-[11px] font-semibold rounded-xl border transition-all duration-200 cursor-pointer ${
                      selectedFaseFilter === fase
                        ? fase === 'Todas'
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                          : 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-600/20'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-800 hover:border-neutral-300'
                    }`}
                  >
                    {fase}
                  </button>
                ))}
              </div>
            </div>

          {/* Directory scroll panel */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredCausas.length > 0 ? (
              <Suspense fallback={<ViewFallback />}>
                {filteredCausas.map((c) => (
                  <CausaCard
                    key={c.id}
                    causa={c}
                    privacyMode={privacyMode}
                    onSelect={(cause) => {
                      handleSelectCausaFromDashboard(cause.id);
                    }}
                    isSelected={c.id === selectedCausaId}
                  />
                ))}
              </Suspense>
            ) : (
              <div className="card p-8 text-center">
                <Scale className="h-8 w-8 text-neutral-300 mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs text-neutral-500 font-medium">Ningún expediente coincide con la búsqueda o filtro.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className={`lg:col-span-7 h-full transition-all duration-300 ${
          mobileShowDetail && selectedCausa && selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA ? 'block' : 'hidden lg:block'
        }`}>
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
            <div className="card p-16 text-center text-neutral-400">
              <div className="p-4 rounded-2xl bg-neutral-50 inline-block mb-4">
                <Scale className="h-10 w-10 text-neutral-200" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-neutral-600">Seleccione un expediente activo</p>
              <p className="text-xs text-neutral-400 mt-1">Elija una causa de la lista para ver su timeline y gestionar el debido proceso</p>
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
              handleSelectCausaFromDashboard?.(causa.id);
            }}
          />
        </div>
      )}
    </div>
  );
}
