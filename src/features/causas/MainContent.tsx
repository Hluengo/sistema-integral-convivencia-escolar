/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, Suspense, lazy } from 'react';
import type { FaseProcedimental } from '../../shared/lib/types';
import type { SidebarView } from '../../widgets/sidebar/Sidebar';
import { ChevronRight } from 'lucide-react';
import { VIEW_TITLES } from '../../widgets/header/constants';
import ErrorBoundary from '../../shared/ui/ErrorBoundary';
import ViewLoader from '../../shared/ui/ViewLoader';
import { useCausasStore } from '../../shared/lib/stores/causasStore';
import { useUIStore } from '../../shared/lib/stores/uiStore';
import type {
  CausaWorkspaceViewModel,
  CreateCausaActions,
  MainNavigationActions,
} from './MainContent/viewContracts';

const DashboardStats = lazy(() => import('../dashboard/DashboardStats'));
const CausasView = lazy(() => import('./MainContent/CausasView'));
const StudentsPanel = lazy(() => import('../../features/students/StudentsPanel'));
const AdvisorView = lazy(() => import('./MainContent/AdvisorView'));
const AnotacionesView = lazy(() => import('../../features/anotaciones/AnotacionesView'));
const AdminView = lazy(() => import('../../features/admin/AdminView'));
const ReportsCenter = lazy(() => import('../../features/reports/ReportsCenter'));
const PlatformView = lazy(() => import('../../features/platform/PlatformView'));

interface MainContentProps {
  currentView: SidebarView;
  causaWorkspace: CausaWorkspaceViewModel;
  createCausa: CreateCausaActions;
  navigation: MainNavigationActions;
  onboardingEnabled: boolean;
  coursesCount: number;
}

export default function MainContent({
  currentView,
  causaWorkspace,
  createCausa,
  navigation,
  onboardingEnabled,
  coursesCount,
}: MainContentProps) {
  const privacyMode = useUIStore((state) => state.privacyMode);
  const setSelectedFaseFilter = useCausasStore((state) => state.setSelectedFaseFilter);
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
        className="mb-5 flex items-center gap-1.5 text-xs text-neutral-600"
      >
        {currentView !== 'dashboard' ? (
          <>
            <button
              type="button"
              onClick={() => navigation.onNavigate('dashboard')}
              className="rounded-md px-1.5 py-1 font-semibold text-neutral-700 transition-colors hover:bg-white hover:text-brand-700"
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
          <Suspense fallback={<ViewLoader view={currentView} />}>
            <DashboardStats
              causas={causaWorkspace.causas}
              onFaseSelect={handleFaseSelect}
              onboardingEnabled={onboardingEnabled}
              coursesCount={coursesCount}
              onNavigate={navigation.onNavigate}
              onSelectCausa={navigation.onSelectCausaFromDashboard}
              privacyMode={privacyMode}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 2: CAUSAS (Active Cases workspace) */}
      {currentView === 'causas' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewLoader view={currentView} />}>
            <CausasView
              workspace={causaWorkspace}
              createCausa={createCausa}
              navigation={navigation}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 4: AI ADVISOR */}
      {currentView === 'informes' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewLoader view={currentView} />}>
            <AdvisorView
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 5: ALUMNOS */}
      {currentView === 'alumnos' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewLoader view={currentView} />}>
            <StudentsPanel privacyMode={privacyMode} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* VIEW 6: ANOTACIONES */}
      {currentView === 'anotaciones' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewLoader view={currentView} />}>
            <AnotacionesView privacyMode={privacyMode} />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentView === 'reportes' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewLoader view={currentView} />}>
            <ReportsCenter causas={causaWorkspace.causas} />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentView === 'admin' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewLoader view={currentView} />}>
            <AdminView />
          </Suspense>
        </ErrorBoundary>
      )}

      {currentView === 'platform' && (
        <ErrorBoundary>
          <Suspense fallback={<ViewLoader view={currentView} />}>
            <PlatformView />
          </Suspense>
        </ErrorBoundary>
      )}
    </main>
  );
}
