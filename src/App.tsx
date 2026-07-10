/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { Causa, EstadoCausa, UserRole, FaseProcedimental } from './types';
import { getFaseForEstado } from './data';
import type { SidebarView } from './components/Sidebar';
import { AppProvider } from './context/AppContext';
import { createCausa, deleteCausa, onAuthStateChange, signOut } from './lib/supabase';
import { useNewCausaForm } from './hooks/useNewCausaForm';
import { useCourses, useStudents } from './hooks/useData';
import { createDraftCausa } from './lib/causaFactory';
import { nowDateOnly } from './lib/dateUtils';
import { SaveStatus, useCausasPersistence } from './hooks/useCausasPersistence';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

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
  const [selectedFaseFilter, setSelectedFaseFilter] = useState<FaseProcedimental | 'Todas'>('Todas');
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
  const newEstCurso = courses.find(c => c.id === selectedCourseId)?.name ?? '';

  const [currentRole, setRole] = useState<UserRole>('convivencia_escolar');
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<SidebarView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);

  const isTimelineCollapsedRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeCausas = useMemo(
    () => causas.filter(c => c.estadoActual !== EstadoCausa.CAUSA_CERRADA),
    [causas]
  );

  const closedCausas = useMemo(
    () => causas.filter(c => c.estadoActual === EstadoCausa.CAUSA_CERRADA),
    [causas]
  );

  const aulaSeguraCausas = useMemo(
    () => causas.filter(c => c.comprometeAulaSegura && c.estadoActual !== EstadoCausa.CAUSA_CERRADA),
    [causas]
  );

  useCausasPersistence({
    causas,
    setCausas,
    setSelectedCausaId,
    setSaveStatus,
    isAuthenticated: !!user,
  });

  const handleViewChange = useCallback((view: SidebarView) => {
    setCurrentView(view);
    if (view === 'causas') {
      if (selectedCausaId) {
        isTimelineCollapsedRef.current = false;
      }
    } else {
      isTimelineCollapsedRef.current = false;
    }
  }, [selectedCausaId]);

  const handleStudentSelect = useCallback((studentId: string) => {
    if (!studentId) {
      dispatchForm({ type: 'SET_STUDENT', nombre: '', rut: '' });
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (student) {
      dispatchForm({ type: 'SET_STUDENT', nombre: student.full_name, rut: student.rut });
    }
  }, [students, dispatchForm]);

  const selectedCausa = useMemo(
    () => causas.find(c => c.id === selectedCausaId),
    [causas, selectedCausaId]
  );

  const filteredCausas = useMemo(() => activeCausas.filter(c => {
    if (selectedFaseFilter !== 'Todas') {
      const fase = getFaseForEstado(c.estadoActual);
      if (fase !== selectedFaseFilter) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = c.estudianteNombre.toLowerCase().includes(query) || c.nnaProtectedName.toLowerCase().includes(query);
      const matchId = c.id.toLowerCase().includes(query);
      const matchCourse = c.estudianteCurso.toLowerCase().includes(query);
      if (!matchName && !matchId && !matchCourse) return false;
    }

    return true;
  }), [activeCausas, selectedFaseFilter, searchQuery]);

  const handleCreateCausa = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEstNombre || !newEstRut) return;

    const newObj = createDraftCausa({
      counter: Math.floor(Math.random() * 900) + 100,
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
      setCausas(prev => [createdCausa, ...prev]);
      setSelectedCausaId(result);
      dispatchForm({ type: 'RESET' });
      setCurrentView('causas');
    }
  }, [newEstNombre, newEstRut, newEstCurso, newInfTipo, newAulaSegura, newObs, newResponsable, dispatchForm]);

  const requireAuth = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  }, [user, setShowLoginModal]);

  const handleUpdateCausa = useCallback((updated: Causa) => {
    if (!requireAuth()) return;
    setCausas(prev => prev.map(c => c.id === updated.id ? updated : c));
  }, [requireAuth]);

  const handleDeleteCausa = useCallback(async (id: string) => {
    if (!requireAuth()) return;
    const ok = await deleteCausa(id);
    if (!ok) {
      console.error(`Failed to delete causa ${id}`);
      return;
    }
    setCausas(prev => {
      const next = prev.filter(c => c.id !== id);
      if (selectedCausaId === id) {
        setSelectedCausaId(next[0]?.id || '');
      }
      return next;
    });
  }, [selectedCausaId, requireAuth]);

  const handleReopenCausa = useCallback((causa: Causa) => {
    const updated: Causa = {
      ...causa,
      estadoActual: EstadoCausa.PROCESO_SEGUIMIENTO,
      fechaUltimaActualizacion: nowDateOnly()
    };
    setCausas(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedCausaId(causa.id);
    setCurrentView('causas');
    isTimelineCollapsedRef.current = false;
  }, []);

  const handleSelectCausaFromDashboard = useCallback((causaId: string) => {
    setSelectedCausaId(causaId);
    setCurrentView('causas');
    setMobileShowDetail(true);
    isTimelineCollapsedRef.current = false;
  }, []);

  const handleOpenCreateForm = useCallback(() => {
    if (!requireAuth()) return;
    dispatchForm({ type: 'OPEN' });
    setCurrentView('causas');
  }, [dispatchForm, requireAuth]);

  const contextValue = useMemo(() => ({
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
  }), [
    user, causas, selectedCausaId, currentRole, privacyMode, currentView,
    mobileShowDetail, saveStatus, activeCausas, closedCausas, aulaSeguraCausas,
    handleUpdateCausa, handleDeleteCausa, handleSelectCausaFromDashboard, handleOpenCreateForm,
  ]);

  const formSetters = useMemo(() => ({
    setNewEstNombre: (v: string) => dispatchForm({ type: 'SET_FIELD', field: 'newEstNombre', value: v }),
    setNewEstRut: (v: string) => dispatchForm({ type: 'SET_FIELD', field: 'newEstRut', value: v }),
    setNewInfTipo: (v: Causa['tipoInfraccion']) => dispatchForm({ type: 'SET_FIELD', field: 'newInfTipo', value: v }),
    setNewAulaSegura: (v: boolean) => dispatchForm({ type: 'SET_FIELD', field: 'newAulaSegura', value: v }),
    setNewObs: (v: string) => dispatchForm({ type: 'SET_FIELD', field: 'newObs', value: v }),
    setNewResponsable: (v: string) => dispatchForm({ type: 'SET_FIELD', field: 'newResponsable', value: v }),
    onCourseChange: (courseId: string) => dispatchForm({ type: 'SET_COURSE', courseId }),
    onClose: () => dispatchForm({ type: 'CLOSE' }),
  }), [dispatchForm]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent" />
          <p className="text-xs text-neutral-500 mt-3">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
    <AppProvider value={contextValue}>
    <div className="min-h-screen bg-neutral-100 flex font-sans text-neutral-800 antialiased">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none">
        Saltar al contenido principal
      </a>
      <Suspense fallback={null}>
        <CommandPalette
          causas={causas}
          onNavigate={handleViewChange}
          onSelectCausa={setSelectedCausaId}
        />
      </Suspense>
      <Suspense fallback={<div className="w-16 bg-white border-r border-neutral-200/60 h-screen" />}>
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          activeCount={activeCausas.length}
          aulaSeguraCount={aulaSeguraCausas.length}
        />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0">
        <Suspense fallback={<div className="h-16 bg-white border-b border-neutral-200/60" />}>
          <Header
            privacyMode={privacyMode}
            setPrivacyMode={setPrivacyMode}
            saveStatus={saveStatus}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            currentView={currentView}
            causas={causas}
            user={user}
            onLogout={() => signOut()}
          />
        </Suspense>

        <Suspense fallback={<div className="flex-1 p-6"><div className="h-8 bg-neutral-200 rounded animate-pulse w-48 mb-4" /><div className="h-64 bg-neutral-200 rounded animate-pulse" /></div>}>
          <MainContent
          currentView={currentView}
          causas={causas}
          selectedCausaId={selectedCausaId}
          setSelectedCausaId={setSelectedCausaId}
          selectedCausa={selectedCausa}
          selectedFaseFilter={selectedFaseFilter}
          setSelectedFaseFilter={setSelectedFaseFilter}
          currentRole={currentRole}
          privacyMode={privacyMode}
          mobileShowDetail={mobileShowDetail}
          setMobileShowDetail={setMobileShowDetail}
          activeCausas={activeCausas}
          closedCausas={closedCausas}
          aulaSeguraCausas={aulaSeguraCausas}
          filteredCausas={filteredCausas}
          showCreateForm={showCreateForm}
          dispatchForm={dispatchForm}
          handleUpdateCausa={handleUpdateCausa}
          handleDeleteCausa={handleDeleteCausa}
          handleReopenCausa={handleReopenCausa}
          handleSelectCausaFromDashboard={handleSelectCausaFromDashboard}
          handleOpenCreateForm={handleOpenCreateForm}
          handleCreateCausa={handleCreateCausa}
          handleStudentSelect={handleStudentSelect}
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
          />
        </Suspense>

        <footer className="bg-white border-t border-neutral-200/60 py-5 sm:py-6 mt-auto text-center text-[10px] text-neutral-400 space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-neutral-500 font-medium flex-wrap px-4">
            <span className="font-semibold text-brand-700">Gestión Debido Proceso</span>
            <span aria-hidden="true">·</span>
            <span>Convivencia Escolar</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:inline">Fiscalización & Debido Proceso 2026</span>
          </div>
          <p className="font-mono text-[9px] text-neutral-400 max-w-lg mx-auto leading-relaxed px-4">
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
