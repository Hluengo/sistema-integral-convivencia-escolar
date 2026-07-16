/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Suspense, lazy } from 'react';
import type { Causa, FaseProcedimental } from '../types';
import type { SidebarView } from './Sidebar';
import type { FormAction } from '../hooks/useNewCausaForm';
import CausasView from './MainContent/CausasView';
import ErrorBoundary from './ErrorBoundary';
import { DashboardMetricSkeleton, CausaCardSkeleton } from './Skeleton';

const DashboardStats = lazy(() => import('./DashboardStats'));
const StudentsPanel = lazy(() => import('./StudentsPanel'));
const AdvisorView = lazy(() => import('./MainContent/AdvisorView'));
const AnotacionesView = lazy(() => import('./Anotaciones/AnotacionesView'));

function DashboardFallback() {
  return (
    <div className="animate-fade-in space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardMetricSkeleton key={'metric-' + i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CausaCardSkeleton key={'card-' + i} />
        ))}
      </div>
    </div>
  );
}

function ViewFallback() {
  return <DashboardFallback />;
}

interface MainContentProps {
  currentView: SidebarView;
  causas: Causa[];
  selectedCausaId: string;
  setSelectedCausaId: (id: string) => void;
  selectedCausa: Causa | undefined;
  selectedFaseFilter: FaseProcedimental | 'Todas';
  setSelectedFaseFilter: (f: FaseProcedimental | 'Todas') => void;
  privacyMode: boolean;
  mobileShowDetail: boolean;
  setMobileShowDetail: (v: boolean) => void;
  aulaSeguraCausas: Causa[];
  filteredCausas: Causa[];
  showCreateForm: boolean;
  dispatchForm: React.Dispatch<FormAction>;
  handleReopenCausa: (causa: Causa) => void;
  handleSelectCausaFromDashboard: (causaId: string) => void;
  handleOpenCreateForm: () => void;
}

export default function MainContent({
  currentView,
  causas,
  selectedCausaId,
  setSelectedCausaId,
  selectedCausa,
  selectedFaseFilter,
  setSelectedFaseFilter,
  privacyMode,
  mobileShowDetail,
  setMobileShowDetail,
  aulaSeguraCausas,
  filteredCausas,
  showCreateForm,
  dispatchForm,
  handleReopenCausa,
  handleSelectCausaFromDashboard,
  handleOpenCreateForm,
}: MainContentProps) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8"
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentView === 'dashboard' && 'Vista: Panel de control'}
        {currentView === 'causas' && 'Vista: Expedientes'}
        {currentView === 'informes' && 'Vista: Informes y asesor legal'}
        {currentView === 'alumnos' && 'Vista: Alumnos'}
        {currentView === 'anotaciones' && 'Vista: Gesti\u00f3n de Anotaciones'}
      </div>
      {/* VIEW 1: DASHBOARD - Fully redesigned */}
      {currentView === 'dashboard' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewFallback />}>
            <DashboardStats
              causas={causas}
              onFaseSelect={(fase) => {
                setSelectedFaseFilter(fase);
              }}
              selectedFase={selectedFaseFilter}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 2: CAUSAS (Active Cases workspace) */}
      {currentView === 'causas' && (
        <CausasView
          causas={causas}
          selectedCausaId={selectedCausaId}
          setSelectedCausaId={setSelectedCausaId}
          selectedCausa={selectedCausa}
          selectedFaseFilter={selectedFaseFilter}
          setSelectedFaseFilter={setSelectedFaseFilter}
          privacyMode={privacyMode}
          mobileShowDetail={mobileShowDetail}
          setMobileShowDetail={setMobileShowDetail}
          filteredCausas={filteredCausas}
          aulaSeguraCausas={aulaSeguraCausas}
          showCreateForm={showCreateForm}
          dispatchForm={dispatchForm}
          handleReopenCausa={handleReopenCausa}
          handleSelectCausaFromDashboard={handleSelectCausaFromDashboard}
          handleOpenCreateForm={handleOpenCreateForm}
        />
      )}

      {/* VIEW 4: AI ADVISOR */}
      {currentView === 'informes' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewFallback />}>
            <AdvisorView />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 5: ALUMNOS */}
      {currentView === 'alumnos' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewFallback />}>
            <StudentsPanel privacyMode={privacyMode} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 6: ANOTACIONES */}
      {currentView === 'anotaciones' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewFallback />}>
            <AnotacionesView privacyMode={privacyMode} />
          </Suspense>
        </ErrorBoundary>
      )}
    </main>
  );
}
