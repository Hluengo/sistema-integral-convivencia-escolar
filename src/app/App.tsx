/** @license SPDX-License-Identifier: Apache-2.0 */

import { Suspense, useCallback } from 'react';
import { useAuthStore } from '../shared/lib/stores/authStore';
import { useCausasStore } from '../shared/lib/stores/causasStore';
import { useUIStore } from '../shared/lib/stores/uiStore';
import { useMemberships } from '../shared/api/hooks/useMemberships';
import { ToastProvider } from '../shared/ui/Toast';
import {
  CommandPaletteSkeleton,
  HeaderSkeleton,
  MainContentSkeleton,
  ModalSkeleton,
  SidebarSkeleton,
} from '../shared/Skeleton';
import { AppProvider } from '../shared/lib/AppContext';
import { MembershipLoading, MembershipAccessDenied } from '../shared/ui';
import WelcomeModal from '../shared/ui/WelcomeModal';
import AppFooter from './components/AppFooter';
import AppLoadingFallback from './components/AppLoadingFallback';
import AppLoadError from './components/AppLoadError';
import SkipToContent from './components/SkipToContent';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useCausaWorkspace } from './hooks/useCausaWorkspace';
import { useNewCausaModalController } from './hooks/useNewCausaModalController';
import { useRoleGates } from './hooks/useRoleGates';
import { useUrlRouting } from './hooks/useUrlRouting';
import { useWelcomeGate } from './hooks/useWelcomeGate';
import * as Lazy from './lazyAppComponents';

export default function App() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.authLoading);
  const showLoginModal = useAuthStore((s) => s.showLoginModal);
  const setShowLoginModal = useAuthStore((s) => s.setShowLoginModal);
  const clearSessionExpired = useAuthStore((s) => s.clearSessionExpired);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tenantId = useAuthStore((s) => s.tenantId);
  const appRole = useAuthStore((s) => s.appRole);
  const profileRole = useAuthStore((s) => s.profileRole);

  const membership = useMemberships('convivencia');
  const saveStatus = useCausasStore((s) => s.saveStatus);
  const setSelectedFaseFilter = useCausasStore((s) => s.setSelectedFaseFilter);
  const handleReopenCausaAction = useCausasStore((s) => s.handleReopenCausa);

  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const isSidebarCollapsed = useUIStore((s) => s.isSidebarCollapsed);
  const setIsSidebarCollapsed = useUIStore((s) => s.setIsSidebarCollapsed);
  const setMobileShowDetail = useUIStore((s) => s.setMobileShowDetail);
  const privacyMode = useUIStore((s) => s.privacyMode);
  const togglePrivacyMode = useUIStore((s) => s.togglePrivacyMode);
  const showShortcuts = useUIStore((s) => s.showShortcuts);
  const setShowShortcuts = useUIStore((s) => s.setShowShortcuts);

  const { canAccessAdmin, canAccessReports, canAccessPlatform, onboardingEnabled } = useRoleGates({
    isAuthenticated,
    tenantId,
    userId: user?.id,
    profileRole,
    appRole,
  });
  const { showWelcome, dismissWelcome, loginFromWelcome } = useWelcomeGate({
    authLoading,
    user,
    setShowLoginModal,
  });
  const {
    causas,
    selectedCausaId,
    setSelectedCausaId,
    selectedCausa,
    filteredCausas,
    loadError,
    retryLoad,
    hasMoreCausas,
    isLoadingMoreCausas,
    loadMoreCausas,
    isCausaDetailLoading,
    isCausasLoading,
  } = useCausaWorkspace({
    isAuthenticated,
    tenantId,
    setCurrentView,
    setMobileShowDetail,
  });
  const { navigateToView, navigateToCausa, navigateHome, closeLoginModal } = useUrlRouting({
    user,
    currentView,
    selectedCausaId,
    canAccessAdmin,
    canAccessReports,
    canAccessPlatform,
    setCurrentView,
    setSelectedCausaId,
    setShowLoginModal,
  });

  const {
    requireAuth,
    handleLogout,
    handleViewChange,
    handleReopenCausa,
    handleSelectCausaFromDashboard,
    handleViewAllNotifications,
  } = useAppNavigation({
    user,
    canAccessAdmin,
    canAccessReports,
    canAccessPlatform,
    clearSessionExpired,
    setShowLoginModal,
    setCurrentView,
    setSelectedCausaId,
    setMobileShowDetail,
    setShowShortcuts,
    setSelectedFaseFilter,
    handleReopenCausaAction,
    navigateToView,
    navigateToCausa,
    navigateHome,
  });

  const showCausasView = useCallback(() => {
    navigateToView('causas');
  }, [navigateToView]);
  const {
    showCreateForm,
    openCreateForm,
    closeCreateForm,
    toggleCreateForm,
    coursesCount,
    modal: newCausaModal,
  } = useNewCausaModalController({
    requireAuth,
    onOpened: showCausasView,
    onCreated: showCausasView,
  });

  useAppShortcuts({
    openCreateForm,
    closeCreateForm,
    closeLoginModal,
    setShowShortcuts,
    showCreateForm,
    showLoginModal,
    showShortcuts,
  });

  if (authLoading) return <AppLoadingFallback />;

  if (user && !membership.loaded && membership.authMode !== 'legacy') {
    return (
      <MembershipLoading
        authMode={membership.authMode}
        legacyFallbackUsed={membership.legacyFallbackUsed}
      />
    );
  }

  if (user && membership.loaded && !membership.hasAccess) {
    return (
      <MembershipAccessDenied
        authMode={membership.authMode}
        legacyFallbackUsed={membership.legacyFallbackUsed}
        membershipError={membership.error}
      />
    );
  }

  return (
    <ToastProvider>
      <AppProvider>
        <div className="flex min-h-dvh overflow-x-clip bg-neutral-100 font-sans text-neutral-800 antialiased">
          <SkipToContent />
          <Suspense fallback={<CommandPaletteSkeleton />}>
            <Lazy.CommandPalette
              causas={causas}
              privacyMode={privacyMode}
              onNavigate={handleViewChange}
              onSelectCausa={handleSelectCausaFromDashboard}
            />
          </Suspense>
          <Suspense fallback={<SidebarSkeleton />}>
            <Lazy.Sidebar
              currentView={currentView}
              onViewChange={handleViewChange}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              activeCount={filteredCausas.length}
              aulaSeguraCount={causas.filter((c) => c.comprometeAulaSegura).length}
              user={user}
              onLogin={() => setShowLoginModal(true)}
              onLogout={handleLogout}
              canAccessAdmin={canAccessAdmin}
              canAccessReports={canAccessReports}
              canAccessPlatform={canAccessPlatform}
            />
          </Suspense>
          <div className="flex min-w-0 flex-1 flex-col">
            <Suspense fallback={<HeaderSkeleton />}>
              <Lazy.Header
                privacyMode={privacyMode}
                onTogglePrivacyMode={togglePrivacyMode}
                saveStatus={saveStatus}
                currentView={currentView}
                causas={causas}
                user={user}
                onNotificationClick={handleSelectCausaFromDashboard}
                onViewAllNotifications={handleViewAllNotifications}
              />
            </Suspense>
            {loadError && <AppLoadError message={loadError} onRetry={retryLoad} />}
            <Suspense fallback={<MainContentSkeleton />}>
              <Lazy.MainContent
                currentView={currentView}
                causaWorkspace={{
                  causas,
                  selectedCausaId,
                  setSelectedCausaId,
                  selectedCausa,
                  isCausaDetailLoading,
                  isCausasLoading,
                  filteredCausas,
                  hasMoreCausas,
                  isLoadingMoreCausas,
                  onLoadMoreCausas: loadMoreCausas,
                }}
                createCausa={{
                  onOpen: openCreateForm,
                  onToggle: toggleCreateForm,
                }}
                navigation={{
                  onNavigate: handleViewChange,
                  onReopenCausa: handleReopenCausa,
                  onSelectCausaFromDashboard: handleSelectCausaFromDashboard,
                }}
                onboardingEnabled={onboardingEnabled}
                coursesCount={coursesCount}
              />
            </Suspense>
            <AppFooter />
          </div>
          {newCausaModal}
          {showShortcuts && (
            <Suspense fallback={<ModalSkeleton />}>
              <Lazy.ShortcutsModal onClose={() => setShowShortcuts(false)} />
            </Suspense>
          )}
          {showLoginModal && (
            <Suspense fallback={<ModalSkeleton />}>
              <Lazy.LoginPage onClose={closeLoginModal} />
            </Suspense>
          )}
          {!user && !showLoginModal && (
            <WelcomeModal open={showWelcome} onClose={dismissWelcome} onLogin={loginFromWelcome} />
          )}
        </div>
      </AppProvider>
    </ToastProvider>
  );
}
