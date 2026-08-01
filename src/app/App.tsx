/** @license SPDX-License-Identifier: Apache-2.0 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef } from 'react';
import { signOut } from '../services/auth.service';
import { useAuthStore } from '../stores/authStore';
import { useCausasStore } from '../stores/causasStore';
import { useUIStore } from '../stores/uiStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useNewCausaForm } from '../hooks/useNewCausaForm';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import { useStudentsQuery } from '../hooks/useStudentsQuery';
import { useCausasPersistence } from '../hooks/useCausasPersistence';
import { useCausaDetailsQuery, useCausasQuery } from '../shared/lib/hooks/useCausasQuery';
import Button from '../shared/ui/Button';
import {
  mergeCausasList,
  syncPersistedCausasToCache,
} from '../shared/lib/queries/causasQueryCache';
import { causasQueryKeys } from '../shared/lib/queries/causasQueryKeys';
import { useMemberships } from '../shared/api/hooks/useMemberships';
import { queryClient } from '../lib/queryClient';
import { ToastProvider } from '../components/Toast';
import { MainContentSkeleton } from '../components/Skeleton';
import { AppProvider } from '../context/AppContext';
import { getFaseForEstado } from '../data';
import { EstadoCausa } from '../types';
import { MembershipLoading, MembershipAccessDenied } from '../shared/ui';

const Header = lazy(() => import('../components/Header'));
const Sidebar = lazy(() => import('../components/Sidebar'));
const MainContent = lazy(() => import('../components/MainContent'));
const CommandPalette = lazy(() => import('../components/CommandPalette'));
const NewCausaModal = lazy(() => import('../components/NewCausaModal'));
const ShortcutsModal = lazy(() => import('../components/ShortcutsModal'));
const LoginPage = lazy(() => import('../components/LoginPage'));

export default function App() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.authLoading);
  const showLoginModal = useAuthStore((s) => s.showLoginModal);
  const setShowLoginModal = useAuthStore((s) => s.setShowLoginModal);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tenantId = useAuthStore((s) => s.tenantId);
  const appRole = useAuthStore((s) => s.appRole);
  const profileRole = useAuthStore((s) => s.profileRole);

  const membership = useMemberships('convivencia');
  const effectiveAdminRole = appRole ?? profileRole;
  const canAccessAdmin = effectiveAdminRole === 'admin' || effectiveAdminRole === 'direccion';
  const canAccessReports = ['admin', 'direccion', 'convivencia', 'inspectoria'].includes(
    effectiveAdminRole ?? '',
  );
  const canAccessPlatform = effectiveAdminRole === 'superadmin';

  const causas = useCausasStore((s) => s.causas);
  const selectedCausaId = useCausasStore((s) => s.selectedCausaId);
  const setSelectedCausaId = useCausasStore((s) => s.setSelectedCausaId);
  const saveStatus = useCausasStore((s) => s.saveStatus);
  const setSaveStatus = useCausasStore((s) => s.setSaveStatus);
  const selectedFaseFilter = useCausasStore((s) => s.selectedFaseFilter);
  const setSelectedFaseFilter = useCausasStore((s) => s.setSelectedFaseFilter);
  const searchQuery = useCausasStore((s) => s.searchQuery);
  const setSearchQuery = useCausasStore((s) => s.setSearchQuery);
  const setCausas = useCausasStore((s) => s.setCausas);
  const handleCreateCausaAction = useCausasStore((s) => s.handleCreateCausa);
  const handleReopenCausaAction = useCausasStore((s) => s.handleReopenCausa);
  const selectedCausa = useMemo(
    () => causas.find((c) => c.id === selectedCausaId) || null,
    [causas, selectedCausaId],
  );
  const filteredCausas = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    return causas.filter((c) => {
      if (c.estadoActual === EstadoCausa.CAUSA_CERRADA) return false;
      if (
        selectedFaseFilter !== 'Todas' &&
        getFaseForEstado(c.estadoActual) !== selectedFaseFilter
      ) {
        return false;
      }
      if (!trimmedQuery) return true;
      return (
        c.estudianteNombre.toLowerCase().includes(trimmedQuery) ||
        c.nnaProtectedName.toLowerCase().includes(trimmedQuery) ||
        c.id.toLowerCase().includes(trimmedQuery) ||
        c.estudianteCurso.toLowerCase().includes(trimmedQuery)
      );
    });
  }, [causas, selectedFaseFilter, searchQuery]);

  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const isSidebarCollapsed = useUIStore((s) => s.isSidebarCollapsed);
  const setIsSidebarCollapsed = useUIStore((s) => s.setIsSidebarCollapsed);
  const mobileShowDetail = useUIStore((s) => s.mobileShowDetail);
  const setMobileShowDetail = useUIStore((s) => s.setMobileShowDetail);
  const privacyMode = useUIStore((s) => s.privacyMode);
  const setPrivacyMode = useUIStore((s) => s.setPrivacyMode);
  const showShortcuts = useUIStore((s) => s.showShortcuts);
  const setShowShortcuts = useUIStore((s) => s.setShowShortcuts);

  const isTimelineCollapsedRef = useRef(false);

  const { formState, dispatchForm } = useNewCausaForm();
  const {
    showCreateForm,
    newEstNombre,
    selectedCourseId,
    newEstRut,
    newInfTipo,
    newAulaSegura,
    newObs,
    newResponsable,
  } = formState;

  const { data: courses = [], isLoading: isLoadingCourses } = useCoursesQuery();
  const { data: students = [], isLoading: isLoadingStudents } = useStudentsQuery(selectedCourseId);
  const newEstCurso = courses.find((c) => c.id === selectedCourseId)?.name ?? '';

  const causasQuery = useCausasQuery();
  const selectedCausaForDetail =
    isAuthenticated && causas.some((causa) => causa.id === selectedCausaId) ? selectedCausaId : '';
  const causaDetailsQuery = useCausaDetailsQuery(selectedCausaForDetail);
  const hasInitializedCausasRef = useRef(false);
  const lastCausasQueryDataRef = useRef<typeof causasQuery.data>(undefined);
  const lastDetailsQueryDataRef = useRef<typeof causaDetailsQuery.data>(undefined);

  const handlePersistedCausas = useCallback(
    (persistedCausas: typeof causas) => {
      if (tenantId) syncPersistedCausasToCache(tenantId, persistedCausas);
    },
    [tenantId],
  );

  const { markCausasHydrated, markCausaHydrated } = useCausasPersistence({
    causas,
    setSaveStatus,
    isAuthenticated,
    onPersisted: handlePersistedCausas,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      lastCausasQueryDataRef.current = undefined;
      lastDetailsQueryDataRef.current = undefined;
      hasInitializedCausasRef.current = false;
      // Evita un ciclo de render: [] es una nueva referencia en cada efecto.
      // Solo limpiamos Zustand si hay información efectivamente cargada.
      if (causas.length > 0) setCausas([]);
      if (selectedCausaId) setSelectedCausaId('');
      queryClient.removeQueries({ queryKey: causasQueryKeys.root });
      return;
    }

    if (!causasQuery.data || lastCausasQueryDataRef.current === causasQuery.data) return;

    const hydratedCausas = mergeCausasList(causas, causasQuery.data);
    markCausasHydrated(hydratedCausas);
    lastCausasQueryDataRef.current = causasQuery.data;
    setCausas(hydratedCausas);
    if (!hasInitializedCausasRef.current) {
      // La carga inicial siempre presenta la tabla: no abre expedientes por defecto.
      setSelectedCausaId('');
      hasInitializedCausasRef.current = true;
    }
  }, [
    causas,
    causasQuery.data,
    isAuthenticated,
    markCausasHydrated,
    selectedCausaId,
    setCausas,
    setSelectedCausaId,
  ]);

  useEffect(() => {
    if (!selectedCausaForDetail || !causaDetailsQuery.data) return;
    if (lastDetailsQueryDataRef.current === causaDetailsQuery.data) return;

    const currentCausa = causas.find((causa) => causa.id === selectedCausaForDetail);
    if (!currentCausa) return;

    const hydratedCausa = { ...currentCausa, ...causaDetailsQuery.data };
    markCausaHydrated(hydratedCausa);
    lastDetailsQueryDataRef.current = causaDetailsQuery.data;
    setCausas((current) =>
      current.map((causa) => (causa.id === hydratedCausa.id ? hydratedCausa : causa)),
    );
  }, [causaDetailsQuery.data, causas, markCausaHydrated, selectedCausaForDetail, setCausas]);

  const loadError = useMemo(() => {
    const error = causasQuery.error ?? causaDetailsQuery.error;
    if (!error) return null;
    return selectedCausaForDetail
      ? 'Error al cargar los antecedentes del expediente.'
      : 'Error al cargar los expedientes. Verifique su conexión.';
  }, [causaDetailsQuery.error, causasQuery.error, selectedCausaForDetail]);

  const retryLoad = useCallback(() => {
    if (selectedCausaForDetail && causaDetailsQuery.error) {
      void causaDetailsQuery.refetch();
      return;
    }
    void causasQuery.refetch();
  }, [causaDetailsQuery, causasQuery, selectedCausaForDetail]);
  const loadMoreCausas = useCallback(() => {
    if (!causasQuery.hasNextPage || causasQuery.isFetchingNextPage) return;
    void causasQuery.fetchNextPage();
  }, [causasQuery]);
  const isCausaDetailLoading = causaDetailsQuery.isLoading;

  const handleViewChange = useCallback(
    (view: typeof currentView) => {
      if (view !== 'dashboard' && !user) {
        setShowLoginModal(true);
        return;
      }
      if (view === 'admin' && !canAccessAdmin) return;
      if (view === 'reportes' && !canAccessReports) return;
      if (view === 'platform' && !canAccessPlatform) return;
      setCurrentView(view);
      isTimelineCollapsedRef.current = false;
    },
    [canAccessAdmin, canAccessReports, canAccessPlatform, user, setShowLoginModal, setCurrentView],
  );

  const handleStudentSelect = useCallback(
    (studentId: string) => {
      if (!studentId) {
        dispatchForm({ type: 'SET_STUDENT', nombre: '', rut: '' });
        return;
      }
      const student = students.find((s) => s.id === studentId);
      if (student)
        dispatchForm({ type: 'SET_STUDENT', nombre: student.full_name, rut: student.rut });
    },
    [students, dispatchForm],
  );

  const handleCreateCausa = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newEstNombre || !newEstRut) return;
      const result = await handleCreateCausaAction({
        newEstNombre,
        newEstRut,
        newEstCurso,
        newInfTipo,
        newAulaSegura,
        newObs,
        newResponsable,
      });
      if (result) {
        dispatchForm({ type: 'RESET' });
        setCurrentView('causas');
      }
    },
    [
      newEstNombre,
      newEstRut,
      newEstCurso,
      newInfTipo,
      newAulaSegura,
      newObs,
      newResponsable,
      dispatchForm,
      handleCreateCausaAction,
      setCurrentView,
    ],
  );

  const requireAuth = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  }, [user, setShowLoginModal]);

  const handleReopenCausa = useCallback(
    (causa: typeof selectedCausa) => {
      if (!causa) return;
      handleReopenCausaAction(causa);
      setCurrentView('causas');
      isTimelineCollapsedRef.current = false;
    },
    [handleReopenCausaAction, setCurrentView],
  );

  const handleSelectCausaFromDashboard = useCallback(
    (causaId: string) => {
      if (!user) {
        setShowLoginModal(true);
        return;
      }
      setSelectedCausaId(causaId);
      setCurrentView('causas');
      setMobileShowDetail(true);
      isTimelineCollapsedRef.current = false;
    },
    [user, setShowLoginModal, setSelectedCausaId, setCurrentView, setMobileShowDetail],
  );

  const handleViewAllNotifications = useCallback(() => {
    setSelectedFaseFilter('Todas');
    setSelectedCausaId('');
    setMobileShowDetail(false);
    setCurrentView('causas');
  }, [setCurrentView, setMobileShowDetail, setSelectedCausaId, setSelectedFaseFilter]);

  const handleOpenCreateForm = useCallback(() => {
    if (!requireAuth()) return;
    dispatchForm({ type: 'OPEN' });
    setCurrentView('causas');
  }, [dispatchForm, requireAuth, setCurrentView]);

  useKeyboardShortcuts({
    onNewCausa: handleOpenCreateForm,
    onToggleShortcuts: () => setShowShortcuts((p) => !p),
    onCloseCreateForm: () => dispatchForm({ type: 'CLOSE' }),
    onCloseLoginModal: () => setShowLoginModal(false),
    onCloseShortcuts: () => setShowShortcuts(false),
    showCreateForm,
    showLoginModal,
    showShortcuts,
  });

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-r-transparent border-solid" />
          <p className="mt-3 text-neutral-500 text-xs">Cargando...</p>
        </div>
      </div>
    );
  }

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
        <div className="flex min-h-dvh bg-neutral-100 font-sans text-neutral-800 antialiased">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none"
          >
            Saltar al contenido principal
          </a>
          <Suspense fallback={null}>
            <CommandPalette
              causas={causas}
              onNavigate={handleViewChange}
              onSelectCausa={setSelectedCausaId}
            />
          </Suspense>
          <Suspense
            fallback={
              <div className="hidden h-dvh w-[68px] flex-col bg-linear-to-b from-neutral-800 to-neutral-950 shadow-xl lg:flex" />
            }
          >
            <Sidebar
              currentView={currentView}
              onViewChange={handleViewChange}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              activeCount={filteredCausas.length}
              aulaSeguraCount={causas.filter((c) => c.comprometeAulaSegura).length}
              user={user}
              onLogin={() => setShowLoginModal(true)}
              onLogout={() => signOut()}
              canAccessAdmin={canAccessAdmin}
              canAccessReports={canAccessReports}
              canAccessPlatform={canAccessPlatform}
            />
          </Suspense>
          <div className="flex min-w-0 flex-1 flex-col">
            <Suspense fallback={<div className="h-16 border-neutral-200/60 border-b bg-white" />}>
              <Header
                privacyMode={privacyMode}
                setPrivacyMode={setPrivacyMode}
                saveStatus={saveStatus}
                currentView={currentView}
                causas={causas}
                user={user}
                onNotificationClick={handleSelectCausaFromDashboard}
                onViewAllNotifications={handleViewAllNotifications}
              />
            </Suspense>
            {loadError && (
              <div
                role="alert"
                className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gravisima-200 bg-gravisima-50 px-4 py-3 text-sm text-gravisima-700 sm:mx-6"
              >
                <span>{loadError}</span>
                <Button variant="danger" onClick={retryLoad} className="rounded-lg px-3 py-1.5">
                  Reintentar
                </Button>
              </div>
            )}
            <Suspense fallback={<MainContentSkeleton />}>
              <MainContent
                currentView={currentView}
                causas={causas}
                selectedCausaId={selectedCausaId}
                setSelectedCausaId={setSelectedCausaId}
                selectedCausa={selectedCausa ?? undefined}
                isCausaDetailLoading={isCausaDetailLoading}
                selectedFaseFilter={selectedFaseFilter}
                setSelectedFaseFilter={setSelectedFaseFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                privacyMode={privacyMode}
                mobileShowDetail={mobileShowDetail}
                setMobileShowDetail={setMobileShowDetail}
                filteredCausas={filteredCausas}
                hasMoreCausas={Boolean(causasQuery.hasNextPage)}
                isLoadingMoreCausas={causasQuery.isFetchingNextPage}
                onLoadMoreCausas={loadMoreCausas}
                showCreateForm={showCreateForm}
                dispatchForm={dispatchForm}
                handleReopenCausa={handleReopenCausa}
                handleSelectCausaFromDashboard={handleSelectCausaFromDashboard}
                handleOpenCreateForm={handleOpenCreateForm}
              />
            </Suspense>
            <footer className="mt-auto space-y-1.5 border-neutral-200/60 border-t bg-white py-5 text-center text-[10px] text-neutral-400 sm:py-6">
              <div className="flex flex-wrap items-center justify-center gap-2 px-4 font-medium text-neutral-500">
                <span className="font-semibold text-brand-700">Gestión de Casos</span>
                <span aria-hidden="true">·</span>
                <span>Convivencia Escolar</span>
                <span className="hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden sm:inline">Fiscalización &amp; Debido Proceso 2026</span>
              </div>
              <p className="mx-auto max-w-lg px-4 font-mono text-[9px] text-neutral-400 leading-relaxed">
                Circular N° 482 · Ley 21809 · Resguardo de NNA en todo el territorio nacional
              </p>
            </footer>
          </div>
          {showCreateForm && (
            <Suspense fallback={null}>
              <NewCausaModal
                newEstNombre={newEstNombre}
                setNewEstNombre={(v: string) =>
                  dispatchForm({ type: 'SET_FIELD', field: 'newEstNombre', value: v })
                }
                newEstRut={newEstRut}
                setNewEstRut={(v: string) =>
                  dispatchForm({ type: 'SET_FIELD', field: 'newEstRut', value: v })
                }
                newEstCurso={newEstCurso}
                newInfTipo={newInfTipo}
                setNewInfTipo={(v: typeof newInfTipo) =>
                  dispatchForm({ type: 'SET_FIELD', field: 'newInfTipo', value: v })
                }
                newAulaSegura={newAulaSegura}
                setNewAulaSegura={(v: boolean) =>
                  dispatchForm({ type: 'SET_FIELD', field: 'newAulaSegura', value: v })
                }
                newObs={newObs}
                setNewObs={(v: string) =>
                  dispatchForm({ type: 'SET_FIELD', field: 'newObs', value: v })
                }
                newResponsable={newResponsable}
                setNewResponsable={(v: string) =>
                  dispatchForm({ type: 'SET_FIELD', field: 'newResponsable', value: v })
                }
                selectedCourseId={selectedCourseId}
                courses={courses}
                students={students}
                isLoadingCourses={isLoadingCourses}
                isLoadingStudents={isLoadingStudents}
                onClose={() => dispatchForm({ type: 'CLOSE' })}
                onSubmit={handleCreateCausa}
                onCourseChange={(courseId: string) =>
                  dispatchForm({ type: 'SET_COURSE', courseId })
                }
                onStudentSelect={handleStudentSelect}
              />
            </Suspense>
          )}
          {showShortcuts && (
            <Suspense fallback={null}>
              <ShortcutsModal onClose={() => setShowShortcuts(false)} />
            </Suspense>
          )}
          {showLoginModal && (
            <Suspense fallback={null}>
              <LoginPage onClose={() => setShowLoginModal(false)} />
            </Suspense>
          )}
        </div>
      </AppProvider>
    </ToastProvider>
  );
}
