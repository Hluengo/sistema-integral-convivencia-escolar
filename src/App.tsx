/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { type Causa, EstadoCausa, type UserRole, type FaseProcedimental } from './types';
import { getFaseForEstado } from './data';
import type { SidebarView } from './components/Sidebar';
import { AppProvider } from './context/AppContext';
import { createCausa, deleteCausa, onAuthStateChange, signOut } from './lib/supabase';
import { useNewCausaForm } from './hooks/useNewCausaForm';
import { useCourses, useStudents } from './hooks/useData';
import { createDraftCausa } from './lib/causaFactory';
import { nowDateOnly } from './lib/dateUtils';
import { type SaveStatus, useCausasPersistence } from './hooks/useCausasPersistence';
import { ToastProvider } from './components/Toast';

const Header = lazy(() => import('./components/Header'));
const Sidebar = lazy(() => import('./components/Sidebar'));
const MainContent = lazy(() => import('./components/MainContent'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const NewCausaModal = lazy(() => import('./components/NewCausaModal'));
const LoginPage = lazy(() => import('./components/LoginPage'));

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [causas, setCausas] = useState<Causa[]>([]);
  const [selectedCausaId, setSelectedCausaId] = useState<string>('');
  const [selectedFaseFilter, setSelectedFaseFilter] = useState<FaseProcedimental | 'Todas'>(
    'Todas'
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

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

  const { courses, isLoading: isLoadingCourses } = useCourses();
  const { students, isLoading: isLoadingStudents } = useStudents(formState.selectedCourseId);
  const newEstCurso = courses.find((c) => c.id === selectedCourseId)?.name ?? '';

  const [currentRole, _setRole] = useState<UserRole>('convivencia_escolar');
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<SidebarView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);

  const isTimelineCollapsedRef = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        setShowLoginModal(false);
      } else {
        setCurrentView('dashboard');
        setSelectedCausaId('');
        setSelectedFaseFilter('Todas');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { activeCausas, closedCausas, aulaSeguraCausas } = useMemo(() => {
    const active: Causa[] = [];
    const closed: Causa[] = [];
    const aulaSegura: Causa[] = [];
    for (const c of causas) {
      const isClosed = c.estadoActual === EstadoCausa.CAUSA_CERRADA;
      if (isClosed) {
        closed.push(c);
      } else {
        active.push(c);
        if (c.comprometeAulaSegura) {
          aulaSegura.push(c);
        }
      }
    }
    return { activeCausas: active, closedCausas: closed, aulaSeguraCausas: aulaSegura };
  }, [causas]);

  useCausasPersistence({
    causas,
    setCausas,
    setSelectedCausaId,
    setSaveStatus,
    isAuthenticated: !!user,
  });

  const handleViewChange = useCallback(
    (view: SidebarView) => {
      if (view !== 'dashboard' && !user) {
        setShowLoginModal(true);
        return;
      }
      setCurrentView(view);
      if (view === 'causas') {
        if (selectedCausaId) {
          isTimelineCollapsedRef.current = false;
        }
      } else {
        isTimelineCollapsedRef.current = false;
      }
    },
    [selectedCausaId, user]
  );

  const handleStudentSelect = useCallback(
    (studentId: string) => {
      if (!studentId) {
        dispatchForm({ type: 'SET_STUDENT', nombre: '', rut: '' });
        return;
      }
      const student = students.find((s) => s.id === studentId);
      if (student) {
        dispatchForm({ type: 'SET_STUDENT', nombre: student.full_name, rut: student.rut });
      }
    },
    [students, dispatchForm]
  );

  const selectedCausa = useMemo(
    () => causas.find((c) => c.id === selectedCausaId),
    [causas, selectedCausaId]
  );

  const filteredCausas = useMemo(
    () =>
      activeCausas.filter((c) => {
        if (selectedFaseFilter !== 'Todas') {
          const fase = getFaseForEstado(c.estadoActual);
          if (fase !== selectedFaseFilter) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchName =
            c.estudianteNombre.toLowerCase().includes(query) ||
            c.nnaProtectedName.toLowerCase().includes(query);
          const matchId = c.id.toLowerCase().includes(query);
          const matchCourse = c.estudianteCurso.toLowerCase().includes(query);
          if (!matchName && !matchId && !matchCourse) {
            return false;
          }
        }

        return true;
      }),
    [activeCausas, selectedFaseFilter, searchQuery]
  );

  const handleCreateCausa = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newEstNombre || !newEstRut) {
        return;
      }

      const nextCounter =
        causas.length > 0
          ? Math.max(...causas.map((c) => Number.parseInt(c.id.split('-')[2], 10) || 0)) + 1
          : 1;
      const newObj = createDraftCausa({
        counter: nextCounter,
        estudianteNombre: newEstNombre,
        estudianteCurso: newEstCurso,
        runEstudiante: newEstRut,
        tipoInfraccion: newInfTipo,
        comprometeAulaSegura: newAulaSegura,
        observaciones: newObs,
        responsable: newResponsable,
      });

      const result = await createCausa(newObj);
      if (result) {
        const createdCausa = { ...newObj, id: result };
        setCausas((prev) => [createdCausa, ...prev]);
        setSelectedCausaId(result);
        dispatchForm({ type: 'RESET' });
        setCurrentView('causas');
      }
    },
    [
      causas,
      newEstNombre,
      newEstRut,
      newEstCurso,
      newInfTipo,
      newAulaSegura,
      newObs,
      newResponsable,
      dispatchForm,
    ]
  );

  const requireAuth = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  }, [user]);

  const handleUpdateCausa = useCallback(
    (updated: Causa) => {
      if (!requireAuth()) {
        return;
      }
      setCausas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    },
    [requireAuth]
  );

  const handleDeleteCausa = useCallback(
    async (id: string) => {
      if (!requireAuth()) {
        return;
      }
      const ok = await deleteCausa(id);
      if (!ok) {
        console.error(`Failed to delete causa ${id}`);
        return;
      }
      const nextCausas = causas.filter((c) => c.id !== id);
      setCausas(nextCausas);
      if (selectedCausaId === id) {
        setSelectedCausaId(nextCausas[0]?.id || '');
      }
    },
    [causas, selectedCausaId, requireAuth]
  );

  const handleReopenCausa = useCallback((causa: Causa) => {
    const updated: Causa = {
      ...causa,
      estadoActual: EstadoCausa.PROCESO_SEGUIMIENTO,
      fechaUltimaActualizacion: nowDateOnly(),
    };
    setCausas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCausaId(causa.id);
    setCurrentView('causas');
    isTimelineCollapsedRef.current = false;
  }, []);

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
    [user]
  );

  const handleOpenCreateForm = useCallback(() => {
    if (!requireAuth()) {
      return;
    }
    dispatchForm({ type: 'OPEN' });
    setCurrentView('causas');
  }, [dispatchForm, requireAuth]);

  // Use ref for keyboard handler to avoid stale closures
  const handleOpenCreateFormRef = useRef(handleOpenCreateForm);
  useEffect(() => {
    handleOpenCreateFormRef.current = handleOpenCreateForm;
  }, [handleOpenCreateForm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
      if (isInput) {
        return;
      }

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleOpenCreateFormRef.current();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (showCreateForm) {
          dispatchForm({ type: 'CLOSE' });
        } else if (showLoginModal) {
          setShowLoginModal(false);
        } else if (showShortcuts) {
          setShowShortcuts(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCreateForm, showLoginModal, showShortcuts, dispatchForm]);

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      causas,
      selectedCausaId,
      setSelectedCausaId,
      currentRole,
      privacyMode,
      setPrivacyMode,
      currentView,
      setCurrentView,
      handleUpdateCausa,
      handleDeleteCausa,
      handleSelectCausaFromDashboard,
      handleOpenCreateForm,
      mobileShowDetail,
      setMobileShowDetail,
      saveStatus,
      activeCausas,
      closedCausas,
      aulaSeguraCausas,
      setShowLoginModal,
    }),
    [
      user,
      causas,
      selectedCausaId,
      currentRole,
      privacyMode,
      currentView,
      mobileShowDetail,
      saveStatus,
      activeCausas,
      closedCausas,
      aulaSeguraCausas,
      handleUpdateCausa,
      handleDeleteCausa,
      handleSelectCausaFromDashboard,
      handleOpenCreateForm,
    ]
  );

  const formSetters = useMemo(
    () => ({
      setNewEstNombre: (v: string) =>
        dispatchForm({ type: 'SET_FIELD', field: 'newEstNombre', value: v }),
      setNewEstRut: (v: string) =>
        dispatchForm({ type: 'SET_FIELD', field: 'newEstRut', value: v }),
      setNewInfTipo: (v: Causa['tipoInfraccion']) =>
        dispatchForm({ type: 'SET_FIELD', field: 'newInfTipo', value: v }),
      setNewAulaSegura: (v: boolean) =>
        dispatchForm({ type: 'SET_FIELD', field: 'newAulaSegura', value: v }),
      setNewObs: (v: string) => dispatchForm({ type: 'SET_FIELD', field: 'newObs', value: v }),
      setNewResponsable: (v: string) =>
        dispatchForm({ type: 'SET_FIELD', field: 'newResponsable', value: v }),
      onCourseChange: (courseId: string) => dispatchForm({ type: 'SET_COURSE', courseId }),
      onClose: () => dispatchForm({ type: 'CLOSE' }),
    }),
    [dispatchForm]
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-r-transparent border-solid" />
          <p className="mt-3 text-neutral-500 text-xs">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AppProvider value={contextValue}>
        <div className="flex min-h-screen bg-neutral-100 font-sans text-neutral-800 antialiased">
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
              <div className="hidden h-screen w-[68px] flex-col bg-gradient-to-b from-neutral-800 to-neutral-950 shadow-xl lg:flex" />
            }
          >
            <Sidebar
              currentView={currentView}
              onViewChange={handleViewChange}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              activeCount={activeCausas.length}
              aulaSeguraCount={aulaSeguraCausas.length}
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
              />
            </Suspense>

            <Suspense
              fallback={
                <div className="flex-1 p-6">
                  <div className="mb-4 h-8 w-48 animate-pulse rounded bg-neutral-200" />
                  <div className="h-64 animate-pulse rounded bg-neutral-200" />
                </div>
              }
            >
              <MainContent
                currentView={currentView}
                causas={causas}
                selectedCausaId={selectedCausaId}
                setSelectedCausaId={setSelectedCausaId}
                selectedCausa={selectedCausa}
                selectedFaseFilter={selectedFaseFilter}
                setSelectedFaseFilter={setSelectedFaseFilter}
                privacyMode={privacyMode}
                mobileShowDetail={mobileShowDetail}
                setMobileShowDetail={setMobileShowDetail}
                aulaSeguraCausas={aulaSeguraCausas}
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
                <span className="font-semibold text-brand-700">Gestión Debido Proceso</span>
                <span aria-hidden="true">·</span>
                <span>Convivencia Escolar</span>
                <span className="hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden sm:inline">Fiscalización & Debido Proceso 2026</span>
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
                setNewEstNombre={formSetters.setNewEstNombre}
                newEstRut={newEstRut}
                setNewEstRut={formSetters.setNewEstRut}
                newEstCurso={newEstCurso}
                newInfTipo={newInfTipo}
                setNewInfTipo={formSetters.setNewInfTipo}
                newAulaSegura={newAulaSegura}
                setNewAulaSegura={formSetters.setNewAulaSegura}
                newObs={newObs}
                setNewObs={formSetters.setNewObs}
                newResponsable={newResponsable}
                setNewResponsable={formSetters.setNewResponsable}
                selectedCourseId={selectedCourseId}
                courses={courses}
                students={students}
                isLoadingCourses={isLoadingCourses}
                isLoadingStudents={isLoadingStudents}
                onClose={formSetters.onClose}
                onSubmit={handleCreateCausa}
                onCourseChange={formSetters.onCourseChange}
                onStudentSelect={handleStudentSelect}
              />
            </Suspense>
          )}

          {showShortcuts && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                type="button"
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                aria-label="Cerrar atajos de teclado"
                onClick={() => setShowShortcuts(false)}
              />
              <div className="relative w-full max-w-sm animate-scale-in rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="mb-4 font-semibold text-base text-neutral-900">Atajos de teclado</h3>
                <ul className="space-y-2 text-neutral-600 text-sm">
                  <li className="flex justify-between">
                    <span>Nueva causa</span>
                    <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">N</kbd>
                  </li>
                  <li className="flex justify-between">
                    <span>Atajos</span>
                    <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">?</kbd>
                  </li>
                  <li className="flex justify-between">
                    <span>Cerrar modal</span>
                    <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
                      Esc
                    </kbd>
                  </li>
                  <li className="flex justify-between">
                    <span>Paleta de comandos</span>
                    <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
                      Ctrl+K
                    </kbd>
                  </li>
                </ul>
                <button
                  type="button"
                  onClick={() => setShowShortcuts(false)}
                  className="mt-6 w-full cursor-pointer rounded-xl bg-brand-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-brand-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
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
