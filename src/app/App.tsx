/** @license SPDX-License-Identifier: Apache-2.0 */

import { Suspense, lazy, useCallback, useRef } from 'react';
import { signOut } from '../services/auth.service';
import { useAuthStore } from '../stores/authStore';
import { useCausasStore, selectSelectedCausa, selectFilteredCausas } from '../stores/causasStore';
import { useUIStore } from '../stores/uiStore';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useNewCausaForm } from '../hooks/useNewCausaForm';
import { useCoursesQuery } from '../hooks/useCoursesQuery';
import { useStudentsQuery } from '../hooks/useStudentsQuery';
import { useCausasPersistence } from '../hooks/useCausasPersistence';
import { ToastProvider } from '../components/Toast';
import { MainContentSkeleton } from '../components/Skeleton';
import { AppProvider } from '../context/AppContext';

const Header = lazy(() => import('../components/Header'));
const Sidebar = lazy(() => import('../components/Sidebar'));
const MainContent = lazy(() => import('../components/MainContent'));
const CommandPalette = lazy(() => import('../components/CommandPalette'));
const NewCausaModal = lazy(() => import('../components/NewCausaModal'));
const ShortcutsModal = lazy(() => import('../components/ShortcutsModal'));
const LoginPage = lazy(() => import('../components/LoginPage'));
const OnboardingTour = lazy(() => import('../components/Onboarding/OnboardingTour'));

export default function App() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.authLoading);
  const showLoginModal = useAuthStore((s) => s.showLoginModal);
  const setShowLoginModal = useAuthStore((s) => s.setShowLoginModal);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
  const selectedCausa = useCausasStore(selectSelectedCausa);
  const filteredCausas = useCausasStore(selectFilteredCausas);

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

  useCausasPersistence({
    causas,
    setCausas,
    setSelectedCausaId,
    setSaveStatus,
    isAuthenticated,
  });

  const handleViewChange = useCallback(
    (view: typeof currentView) => {
      if (view !== 'dashboard' && !user) {
        setShowLoginModal(true);
        return;
      }
      setCurrentView(view);
      isTimelineCollapsedRef.current = false;
    },
    [user, setShowLoginModal, setCurrentView]
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
    [students, dispatchForm]
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
    ]
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
    [handleReopenCausaAction, setCurrentView]
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
    [user, setShowLoginModal, setSelectedCausaId, setCurrentView, setMobileShowDetail]
  );

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
            />
          </Suspense>
          <div className="flex min-w-0 flex-1 flex-col">
            <Suspense fallback={<div className="h-16 border-neutral-200/60 border-b bg-white" />}>
              <Header
                privacyMode={privacyMode}
                setPrivacyMode={setPrivacyMode}
                saveStatus={saveStatus}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                currentView={currentView}
                causas={causas}
                user={user}
                onNotificationClick={handleSelectCausaFromDashboard}
              />
            </Suspense>
            <Suspense fallback={<MainContentSkeleton />}>
              <MainContent
                currentView={currentView}
                causas={causas}
                selectedCausaId={selectedCausaId}
                setSelectedCausaId={setSelectedCausaId}
                selectedCausa={selectedCausa ?? undefined}
                selectedFaseFilter={selectedFaseFilter}
                setSelectedFaseFilter={setSelectedFaseFilter}
                privacyMode={privacyMode}
                mobileShowDetail={mobileShowDetail}
                setMobileShowDetail={setMobileShowDetail}
                aulaSeguraCausas={causas.filter((c) => c.comprometeAulaSegura)}
                filteredCausas={filteredCausas}
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
          <Suspense fallback={null}>
            <OnboardingTour />
          </Suspense>
        </div>
      </AppProvider>
    </ToastProvider>
  );
}
