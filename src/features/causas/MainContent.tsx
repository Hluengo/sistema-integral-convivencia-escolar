/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, Suspense, lazy } from 'react';
import type { Causa, FaseProcedimental } from '../../shared/lib/types';
import type { SidebarView } from '../../widgets/sidebar/Sidebar';
import type { FormAction } from '../../shared/lib/hooks/useNewCausaForm';
import { ChevronRight } from 'lucide-react';
import { VIEW_TITLES } from '../../widgets/header/constants';
import CausasView from './MainContent/CausasView';
import ErrorBoundary from '../../shared/ui/ErrorBoundary';
import {
  DashboardMetricSkeleton,
  CausaCardSkeleton,
  AnnotationsSkeleton,
  TableSkeleton,
  ChatMessageSkeleton,
} from '../../shared/Skeleton';

const DashboardStats = lazy(() => import('../../components/DashboardStats'));
const StudentsPanel = lazy(() => import('../../features/students/StudentsPanel'));
const AdvisorView = lazy(() => import('./MainContent/AdvisorView'));
const AnotacionesView = lazy(() => import('../../features/anotaciones/AnotacionesView'));
const AdminView = lazy(() => import('../../features/admin/AdminView'));
const ReportsCenter = lazy(() => import('../../features/reports/ReportsCenter'));
const PlatformView = lazy(() => import('../../features/platform/PlatformView'));

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

function AnotacionesFallback() {
  return <AnnotationsSkeleton />;
}

function StudentsFallback() {
  return <TableSkeleton rows={8} />;
}

function AdvisorFallback() {
  return (
    <div className="space-y-4 p-6">
      <ChatMessageSkeleton />
      <ChatMessageSkeleton />
      <ChatMessageSkeleton />
    </div>
  );
}

interface MainContentProps {
  currentView: SidebarView;
  causas: Causa[];
  selectedCausaId: string;
  setSelectedCausaId: (id: string) => void;
  selectedCausa: Causa | undefined;
  isCausaDetailLoading: boolean;
  selectedFaseFilter: FaseProcedimental | 'Todas';
  setSelectedFaseFilter: (f: FaseProcedimental | 'Todas') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
  onboardingEnabled: boolean;
  coursesCount: number;
  onNavigate: (view: SidebarView) => void;
}

export default function MainContent({
  currentView,
  causas,
  selectedCausaId,
  setSelectedCausaId,
  selectedCausa,
  isCausaDetailLoading,
  selectedFaseFilter,
  setSelectedFaseFilter,
  searchQuery,
  setSearchQuery,
  privacyMode,
  mobileShowDetail,
  setMobileShowDetail,
  filteredCausas,
  hasMoreCausas,
  isLoadingMoreCausas,
  onLoadMoreCausas,
  showCreateForm,
  dispatchForm,
  handleReopenCausa,
  handleSelectCausaFromDashboard,
  handleOpenCreateForm,
  onboardingEnabled,
  coursesCount,
  onNavigate,
}: MainContentProps) {
  const handleFaseSelect = useCallback(
    (fase: FaseProcedimental | 'Todas') => setSelectedFaseFilter(fase),
    [setSelectedFaseFilter],
  );

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
        {currentView === 'reportes' && 'Vista: Centro de reportes'}
        {currentView === 'alumnos' && 'Vista: Alumnos'}
        {currentView === 'anotaciones' && 'Vista: Gesti\u00f3n de Anotaciones'}
        {currentView === 'admin' && 'Vista: Administración'}
        {currentView === 'platform' && 'Vista: Plataforma'}
      </div>
      <nav
        aria-label="Migas de pan"
        className="mb-5 flex items-center gap-1.5 text-xs text-neutral-500"
      >
        {currentView !== 'dashboard' ? (
          <>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="rounded-md px-1.5 py-1 font-semibold transition-colors hover:bg-white hover:text-brand-700"
            >
              Inicio
            </button>
            <ChevronRight className="size-3.5 text-neutral-300" aria-hidden="true" />
          </>
        ) : null}
        <span aria-current="page" className="px-1.5 py-1 font-medium text-neutral-700">
          {VIEW_TITLES[currentView].title}
        </span>
      </nav>
      {/* VIEW 1: DASHBOARD - Fully redesigned */}
      {currentView === 'dashboard' && (
        <ErrorBoundary>
          <Suspense fallback={<DashboardFallback />}>
            <DashboardStats
              causas={causas}
              onFaseSelect={handleFaseSelect}
              onboardingEnabled={onboardingEnabled}
              coursesCount={coursesCount}
              onNavigate={onNavigate}
              privacyMode={privacyMode}
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
          isCausaDetailLoading={isCausaDetailLoading}
          selectedFaseFilter={selectedFaseFilter}
          setSelectedFaseFilter={setSelectedFaseFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          privacyMode={privacyMode}
          mobileShowDetail={mobileShowDetail}
          setMobileShowDetail={setMobileShowDetail}
          filteredCausas={filteredCausas}
          hasMoreCausas={hasMoreCausas}
          isLoadingMoreCausas={isLoadingMoreCausas}
          onLoadMoreCausas={onLoadMoreCausas}
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
          <Suspense fallback={<AdvisorFallback />}>
            <AdvisorView
              causas={causas}
              selectedCausa={selectedCausa}
              selectedCausaId={selectedCausaId}
              isCausaDetailLoading={isCausaDetailLoading}
              privacyMode={privacyMode}
              onSelectCausa={setSelectedCausaId}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 5: ALUMNOS */}
      {currentView === 'alumnos' && (
        <ErrorBoundary>
          <Suspense fallback={<StudentsFallback />}>
            <StudentsPanel privacyMode={privacyMode} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 6: ANOTACIONES */}
      {currentView === 'anotaciones' && (
        <ErrorBoundary>
          <Suspense fallback={<AnotacionesFallback />}>
            <AnotacionesView privacyMode={privacyMode} />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentView === 'reportes' && (
        <ErrorBoundary>
          <Suspense fallback={<DashboardFallback />}>
            <ReportsCenter causas={causas} />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentView === 'admin' && (
        <ErrorBoundary>
          <Suspense fallback={<DashboardFallback />}>
            <AdminView />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentView === 'platform' && (
        <ErrorBoundary>
          <Suspense fallback={<DashboardFallback />}>
            <PlatformView />
          </Suspense>
        </ErrorBoundary>
      )}
    </main>
  );
}
