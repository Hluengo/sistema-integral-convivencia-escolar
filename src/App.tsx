/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useState } from 'react';
import { Causa, EstadoCausa, UserRole, FaseProcedimental } from './types';
import { getFaseForEstado } from './data';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import type { SidebarView } from './components/Sidebar';
import MainContent from './components/MainContent';
import { AppProvider } from './context/AppContext';
import { createCausa, deleteCausa } from './lib/supabase';
import { useNewCausaForm } from './hooks/useNewCausaForm';
import { useCourses, useStudents } from './hooks/useData';
import { createDraftCausa } from './lib/causaFactory';
import { nowDateOnly } from './lib/dateUtils';
import { SaveStatus, useCausasPersistence } from './hooks/useCausasPersistence';

const NewCausaModal = lazy(() => import('./components/NewCausaModal'));

export default function App() {
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

  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeCausas = causas.filter(c => c.estadoActual !== EstadoCausa.CAUSA_CERRADA);
  const closedCausas = causas.filter(c => c.estadoActual === EstadoCausa.CAUSA_CERRADA);
  const aulaSeguraCausas = causas.filter(c => c.comprometeAulaSegura && c.estadoActual !== EstadoCausa.CAUSA_CERRADA);

  useCausasPersistence({
    causas,
    setCausas,
    setSelectedCausaId,
    setSaveStatus,
  });

  const handleViewChange = (view: SidebarView) => {
    setCurrentView(view);
    if (view === 'causas') {
      if (selectedCausaId) {
        setIsTimelineCollapsed(false);
      }
    } else {
      setIsTimelineCollapsed(false);
    }
  };

  const handleStudentSelect = (studentId: string) => {
    if (!studentId) {
      dispatchForm({ type: 'SET_STUDENT', nombre: '', rut: '' });
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (student) {
      dispatchForm({ type: 'SET_STUDENT', nombre: student.full_name, rut: student.rut });
    }
  };

  const selectedCausa = causas.find(c => c.id === selectedCausaId);

  const filteredCausas = activeCausas.filter(c => {
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
  });

  const handleCreateCausa = async (e: React.FormEvent) => {
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
  };

  const handleUpdateCausa = (updated: Causa) => {
    setCausas(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDeleteCausa = async (id: string) => {
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
  };

  const handleReopenCausa = (causa: Causa) => {
    const updated: Causa = {
      ...causa,
      estadoActual: EstadoCausa.PROCESO_SEGUIMIENTO,
      fechaUltimaActualizacion: nowDateOnly()
    };
    setCausas(prev => prev.map(c => c.id === updated.id ? updated : c));
    setSelectedCausaId(causa.id);
    setCurrentView('causas');
    setIsTimelineCollapsed(false);
  };

  const handleSelectCausaFromDashboard = (causaId: string) => {
    setSelectedCausaId(causaId);
    setCurrentView('causas');
    setMobileShowDetail(true);
    setIsTimelineCollapsed(false);
  };

  const handleOpenCreateForm = () => {
    dispatchForm({ type: 'OPEN' });
    setCurrentView('causas');
  };

  return (
    <AppProvider value={{
      causas,
      selectedCausaId,
      setSelectedCausaId,
      currentRole,
      privacyMode,
      setPrivacyMode,
      handleUpdateCausa,
      handleDeleteCausa,
      handleSelectCausaFromDashboard,
      handleOpenCreateForm,
    }}>
    <div className="min-h-screen bg-neutral-100 flex font-sans text-neutral-800 antialiased">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        activeCount={activeCausas.length}
        aulaSeguraCount={aulaSeguraCausas.length}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          privacyMode={privacyMode}
          setPrivacyMode={setPrivacyMode}
          saveStatus={saveStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentView={currentView}
          causas={causas}
        />

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
          setNewEstNombre={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newEstNombre', value: v })}
          newEstRut={newEstRut}
          setNewEstRut={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newEstRut', value: v })}
          newEstCurso={newEstCurso}
          newInfTipo={newInfTipo}
          setNewInfTipo={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newInfTipo', value: v })}
          newAulaSegura={newAulaSegura}
          setNewAulaSegura={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newAulaSegura', value: v })}
          newObs={newObs}
          setNewObs={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newObs', value: v })}
          newResponsable={newResponsable}
          setNewResponsable={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newResponsable', value: v })}
          selectedCourseId={selectedCourseId}
          courses={courses}
          students={students}
          isLoadingCourses={isLoadingCourses}
          isLoadingStudents={isLoadingStudents}
        />

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
            setNewEstNombre={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newEstNombre', value: v })}
            newEstRut={newEstRut}
            setNewEstRut={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newEstRut', value: v })}
            newEstCurso={newEstCurso}
            newInfTipo={newInfTipo}
            setNewInfTipo={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newInfTipo', value: v })}
            newAulaSegura={newAulaSegura}
            setNewAulaSegura={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newAulaSegura', value: v })}
            newObs={newObs}
            setNewObs={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newObs', value: v })}
            newResponsable={newResponsable}
            setNewResponsable={(v) => dispatchForm({ type: 'SET_FIELD', field: 'newResponsable', value: v })}
            selectedCourseId={selectedCourseId}
            courses={courses}
            students={students}
            isLoadingCourses={isLoadingCourses}
            isLoadingStudents={isLoadingStudents}
            onClose={() => dispatchForm({ type: 'CLOSE' })}
            onSubmit={handleCreateCausa}
            onCourseChange={(courseId) => dispatchForm({ type: 'SET_COURSE', courseId })}
            onStudentSelect={handleStudentSelect}
          />
        </Suspense>
      )}
    </div>
    </AppProvider>
  );
}
