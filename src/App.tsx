/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useReducer, useEffect, useRef } from 'react';
import { Causa, EstadoCausa, UserRole, FaseProcedimental } from './types';
import { INITIAL_CAUSAS, getFaseForEstado, getBaseChecklist } from './data';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import type { SidebarView } from './components/Sidebar';
import DashboardStats from './components/DashboardStats';
import CausaCard from './components/CausaCard';
import InteractiveTimeline from './components/InteractiveTimeline';
import AiAdvisor from './components/AiAdvisor';
import ClosedCases from './components/ClosedCases';
import PageHeader from './components/PageHeader';
import StudentsPanel from './components/StudentsPanel';
import NewCausaModal from './components/NewCausaModal';
import { Search, Plus, RotateCcw, Scale, Sparkles, BookOpen, ChevronLeft } from 'lucide-react';
import { supabase, type Course, type Student, fetchCausas, createCausa, updateCausa, saveBitacora, saveChecklist } from './lib/supabase';

function generateInitials(fullName: string): string {
  if (!fullName) return "N. N.";
  return fullName
    .split(' ')
    .filter(w => w.length > 2)
    .map(w => w[0].toUpperCase() + '.')
    .join(' ');
}

export default function App() {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [selectedCausaId, setSelectedCausaId] = useState<string>('');
  const [selectedFaseFilter, setSelectedFaseFilter] = useState<FaseProcedimental | 'Todas'>('Todas');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLoadingCausasRef = useRef(true);
  const saveGenerationRef = useRef(0);
  
  // Supabase state
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [studentsState, setStudentsState] = useState<{ list: Student[]; loading: boolean }>({ list: [], loading: false });
  const students = studentsState.list;
  const isLoadingStudents = studentsState.loading;
  const coursesLoadedRef = useRef(false);
  const dataInitializedRef = useRef(false);

  // Header configuration states
  const [currentRole, setRole] = useState<UserRole>('convivencia_escolar');
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  // Sidebar state - NEW SidebarView type
  const [currentView, setCurrentView] = useState<SidebarView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Mobile: track whether to show the detail panel or the list
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);

  // Collapsible view layouts for workspace
  const isTimelineCollapsed = useRef(false);
  const setIsTimelineCollapsed = (val: boolean) => { isTimelineCollapsed.current = val; };

  // Search input state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New Causa Creation Form — consolidated into useReducer
  interface FormState {
    showCreateForm: boolean;
    newEstNombre: string;
    selectedCourseId: string;
    newEstRut: string;
    newInfTipo: Causa['tipoInfraccion'];
    newAulaSegura: boolean;
    newObs: string;
    newResponsable: string;
  }

  type FormAction =
    | { type: 'OPEN' }
    | { type: 'CLOSE' }
    | { type: 'SET_COURSE'; courseId: string }
    | { type: 'SET_STUDENT'; nombre: string; rut: string }
    | { type: 'SET_FIELD'; field: keyof Omit<FormState, 'showCreateForm' | 'selectedCourseId'>; value: string | boolean }
    | { type: 'RESET' };

  const FORM_INITIAL: FormState = {
    showCreateForm: false,
    newEstNombre: '',
    selectedCourseId: '',
    newEstRut: '',
    newInfTipo: 'Grave',
    newAulaSegura: false,
    newObs: '',
    newResponsable: 'Esteban Valenzuela (Encargado de Convivencia)',
  };

  function formReducer(state: FormState, action: FormAction): FormState {
    switch (action.type) {
      case 'OPEN':  return { ...state, showCreateForm: true };
      case 'CLOSE': return { ...state, showCreateForm: false };
      case 'SET_COURSE':
        return { ...state, selectedCourseId: action.courseId, newEstNombre: '', newEstRut: '' };
      case 'SET_STUDENT':
        return { ...state, newEstNombre: action.nombre, newEstRut: action.rut };
      case 'SET_FIELD':
        return { ...state, [action.field]: action.value };
      case 'RESET':
        return { ...FORM_INITIAL, showCreateForm: false };
      default:
        return state;
    }
  }

  const [formState, dispatchForm] = useReducer(formReducer, FORM_INITIAL);
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
  const newEstCurso = courses.find(c => c.id === selectedCourseId)?.name ?? '';

  // Active vs Closed counts
  const activeCausas = causas.filter(c => c.estadoActual !== EstadoCausa.CAUSA_CERRADA);
  const closedCausas = causas.filter(c => c.estadoActual === EstadoCausa.CAUSA_CERRADA);
  const aulaSeguraCausas = causas.filter(c => c.comprometeAulaSegura && c.estadoActual !== EstadoCausa.CAUSA_CERRADA);

  // Map new sidebar views to legacy actions
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

  // Load courses from Supabase on mount
  useEffect(() => {
    if (coursesLoadedRef.current) return;
    coursesLoadedRef.current = true;
    
    async function loadCourses() {
      setIsLoadingCourses(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('position', { ascending: true });
      
      if (!error && data) {
        setCourses(data);
      }
      setIsLoadingCourses(false);
    }
    loadCourses();
  }, []);

  // Load causas from Supabase on mount, seed if empty
  useEffect(() => {
    if (dataInitializedRef.current) return;
    dataInitializedRef.current = true;

    async function loadCausas() {
      isLoadingCausasRef.current = true;
      try {
        const loaded = await fetchCausas();
        setCausas(loaded);
        if (loaded.length > 0) {
          setSelectedCausaId(loaded[0].id);
        }
      } catch (error) {
        console.error('Error loading causas from Supabase:', error);
        setCausas([]);
        setSelectedCausaId('');
      } finally {
        isLoadingCausasRef.current = false;
      }
    }

    loadCausas();
  }, []);

  // Auto-save causes to Supabase with debounce whenever they change
  useEffect(() => {
    if (causas.length === 0 || isLoadingCausasRef.current) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const generation = ++saveGenerationRef.current;

    saveTimeoutRef.current = setTimeout(async () => {
      if (generation !== saveGenerationRef.current) return;
      setSaveStatus('saving');

      if (generation !== saveGenerationRef.current) return;

      const results = await Promise.all(causas.map(async (causa) => {
        const success = await updateCausa(causa);
        if (!success) {
          const created = await createCausa(causa);
          if (!created) {
            console.error(`Failed to save causa ${causa.id}`);
            return false;
          }
        }
        await Promise.all([
          saveBitacora(causa.id, causa.bitacora),
          saveChecklist(causa.id, causa.checklistDebidoProceso),
        ]);
        return true;
      }));

      if (results.some(r => !r)) {
        setSaveStatus('error');
        return;
      }
      
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 2000);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [causas]);

  // When course changes, load its students
  useEffect(() => {
    if (!selectedCourseId) {
      setStudentsState({ list: [], loading: false });
      return;
    }

    let cancelled = false;
    setStudentsState(prev => ({ ...prev, loading: true }));

    async function loadStudents() {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('course_id', selectedCourseId)
        .order('full_name', { ascending: true });
      
      if (cancelled) return;
      setStudentsState({ list: !error && data ? data : [], loading: false });
    }
    loadStudents();
    return () => { cancelled = true; };
  }, [selectedCourseId]);

  // When student is selected, autofill name + RUT
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

  // Selected cause derived item helper
  const selectedCausa = causas.find(c => c.id === selectedCausaId);

  // Filtered list of causes (for active cases view)
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

  // Submit cause creator
  const handleCreateCausa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEstNombre || !newEstRut) return;

    const nextCounter = causas.length + 1;
    const padding = nextCounter < 10 ? `00${nextCounter}` : nextCounter < 100 ? `0${nextCounter}` : `${nextCounter}`;
    const nextId = `DC-2026-${padding}`;

    const checklist = getBaseChecklist();

    const newObj: Causa = {
      id: nextId,
      estudianteNombre: newEstNombre,
      estudianteCurso: newEstCurso,
      nnaProtectedName: generateInitials(newEstNombre),
      runEstudiante: newEstRut,
      fechaApertura: new Date('2026-05-27T14:50:29Z').toISOString().split('T')[0],
      estadoActual: EstadoCausa.DENUNCIA_RECEPCIONADA,
      tipoInfraccion: newInfTipo,
      responsable: newResponsable,
      comprometeAulaSegura: newAulaSegura,
      fechaUltimaActualizacion: new Date('2026-05-27T14:50:29Z').toISOString().split('T')[0],
      observaciones: newObs || 'Registro inicial del procedimiento regulado.',
      bitacora: [
        {
          id: `b_init_${Date.now()}`,
          fecha: new Date('2026-05-27T14:50:29Z').toISOString().replace('.000Z', 'Z'),
          tipo: 'Otro',
          titulo: "Apertura formal de Causa de Convivencia",
          descripcion: "Se inicia formalmente la tramitación del expediente de disciplina de conformidad con el Reglamento Interno (RIE) del colegio.",
          participantes: [newResponsable.split(' (')[0]]
        }
      ],
      checklistDebidoProceso: checklist
    };

    const updated = [newObj, ...causas];
    setCausas(updated);
    setSelectedCausaId(nextId);
    dispatchForm({ type: 'RESET' });
    setCurrentView('causas');
  };

  // Handler update cause from inner interactions
  const handleUpdateCausa = (updated: Causa) => {
    const nextArr = causas.map(c => {
      if (c.id === updated.id) return updated;
      return c;
    });
    setCausas(nextArr);
  };

  // Reopen a closed case
  const handleReopenCausa = (causa: Causa) => {
    const updated: Causa = {
      ...causa,
      estadoActual: EstadoCausa.PROCESO_SEGUIMIENTO,
      fechaUltimaActualizacion: new Date('2026-05-27T14:50:29Z').toISOString().split('T')[0]
    };
    handleUpdateCausa(updated);
    setSelectedCausaId(causa.id);
    setCurrentView('causas');
    setIsTimelineCollapsed(false);
  };

  // Reset to original mock database values
  const handleRestoreDatabase = () => {
    if (confirm("¿Está seguro de restaurar los datos del expediente a su estado original? Se perderán las causas que haya creado en esta sesión.")) {
      setCausas(INITIAL_CAUSAS);
      setSelectedCausaId(INITIAL_CAUSAS[0]?.id || '');
    }
  };

  // Navigate from dashboard to a specific causa
  const handleSelectCausaFromDashboard = (causaId: string) => {
    setSelectedCausaId(causaId);
    setCurrentView('causas');
    setMobileShowDetail(true);
    setIsTimelineCollapsed(false);
  };

  // Toggle create form from dashboard
  const handleOpenCreateForm = () => {
    dispatchForm({ type: 'OPEN' });
    setCurrentView('causas');
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex font-sans text-neutral-800 antialiased">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        activeCount={activeCausas.length}
        closedCount={closedCausas.length}
        aulaSeguraCount={aulaSeguraCausas.length}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          privacyMode={privacyMode}
          setPrivacyMode={setPrivacyMode}
          saveStatus={saveStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentView={currentView}
        />

        <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          {/* VIEW 1: DASHBOARD - Fully redesigned */}
          {currentView === 'dashboard' && (
            <DashboardStats
              causas={causas}
              onFaseSelect={(fase) => {
                setSelectedFaseFilter(fase);
                setCurrentView('causas');
              }}
              selectedFase={selectedFaseFilter}
              onSelectCausa={handleSelectCausaFromDashboard}
              onCreateCausa={handleOpenCreateForm}
            />
          )}

          {/* VIEW 2: CAUSAS (Active Cases workspace) */}
          {currentView === 'causas' && (
            <div className="space-y-6 animate-fade-in">
              {/* Hero header — aligned with dashboard */}
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
                  {currentRole !== 'docente' && (
                    <button
                      type="button"
                      onClick={() => dispatchForm({ type: showCreateForm ? 'CLOSE' : 'OPEN' })}
                      className="inline-flex items-center justify-center gap-2 bg-secondary-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-secondary-600 active:scale-[0.97] transition-all shadow-md shadow-secondary-500/30 shrink-0"
                      aria-label="Crear nueva causa"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Nueva Causa
                    </button>
                  )}
                </div>
              </div>

            {/* Mobile tab switcher — list vs detail (only visible below lg) */}
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
              
              {/* Left column: list — hidden on mobile when detail is shown */}
              <div className={`lg:col-span-5 space-y-4 transition-all duration-300 ${
                mobileShowDetail && selectedCausa && selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA ? 'hidden lg:block' : 'block'
              }`}>
                
                <div className="relative card p-5 space-y-4">
                  <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-brand-600" aria-hidden="true" />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-brand-50">
                        <BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-neutral-900">Expedientes Activos</h3>
                        <p className="text-[11px] text-neutral-400 font-medium">{filteredCausas.length} resultados</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleRestoreDatabase}
                        className="text-[10px] text-neutral-500 hover:text-neutral-700 flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 font-medium transition-all cursor-pointer"
                        title="Restaurar base de datos"
                        aria-label="Restaurar datos iniciales"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        <span className="hidden sm:inline">Restaurar</span>
                      </button>
                    </div>
                  </div>

                  {/* Fase filter pills */}
                  <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Filtro por fase">
                    {(['Todas', 'Recepción', 'Investigación', 'Resolución', 'Impugnación', 'Seguimiento'] as const).map((fase) => (
                      <button
                        type="button"
                        key={fase}
                        onClick={() => setSelectedFaseFilter(fase)}
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

                  {/* Search box */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar estudiante, curso o código..."
                      className="w-full bg-neutral-50 text-neutral-800 pl-10 pr-4 py-2.5 text-sm font-medium rounded-xl border border-neutral-200/80 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all"
                      aria-label="Buscar expedientes"
                    />
                  </div>
                </div>

                {/* New Causa Creator — moved to modal overlay (rendered at root level below) */}

                {/* Directory scroll panel */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredCausas.length > 0 ? (
                    filteredCausas.map((c) => (
                      <CausaCard
                        key={c.id}
                        causa={c}
                        privacyMode={privacyMode}
                        onSelect={(cause) => {
                          setSelectedCausaId(cause.id);
                          setIsTimelineCollapsed(false);
                          setMobileShowDetail(true);
                        }}
                        isSelected={c.id === selectedCausaId}
                      />
                    ))
                  ) : (
                    <div className="card p-8 text-center">
                      <Search className="h-8 w-8 text-neutral-300 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-xs text-neutral-500 font-medium">Ningún expediente coincide con la búsqueda o filtro.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Interactive details Timeline */}
              {/* On mobile: full width when mobileShowDetail is true */}
              <div className={`lg:col-span-7 h-full transition-all duration-300 ${
                mobileShowDetail && selectedCausa && selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA ? 'block' : 'hidden lg:block'
              }`}>
                {/* Mobile back button */}
                {selectedCausa && selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA && (
                  <button
                    type="button"
                    onClick={() => setMobileShowDetail(false)}
                    className="lg:hidden mb-3 flex items-center gap-2 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors"
                    aria-label="Volver a la lista"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Volver a la lista
                  </button>
                )}
                {selectedCausa && selectedCausa.estadoActual !== EstadoCausa.CAUSA_CERRADA ? (
                  <InteractiveTimeline
                    causa={selectedCausa}
                    onUpdateCausa={handleUpdateCausa}
                    currentRole={currentRole}
                    privacyMode={privacyMode}
                    isSidebarCollapsed={false}
                    setIsSidebarCollapsed={undefined}
                    isTimelineCollapsed={false}
                    setIsTimelineCollapsed={undefined}
                  />
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
            </div>
          )}

          {/* VIEW 3: CLOSED CASES */}
          {currentView === 'causas' && selectedCausaId === '' && filteredCausas.length === 0 && (
            <div className="flex-1">
              <ClosedCases
                causas={causas}
                privacyMode={privacyMode}
                onReopenCausa={handleReopenCausa}
                onSelectCausa={(causa) => {
                  setSelectedCausaId(causa.id);
                  setCurrentView('causas');
                  setIsTimelineCollapsed(false);
                }}
              />
            </div>
          )}

          {/* VIEW 4: AI ADVISOR */}
          {currentView === 'informes' && (
            <div className="flex-1 max-w-3xl mx-auto space-y-4 animate-fade-in">
              <PageHeader
                title="Asistente Judicial"
                description="Redacta informes y fiscaliza plazos con apoyo de IA, configurada con las Circulares de la Superintendencia de Educación."
              />
              <div className="bg-brand-50/50 border border-brand-100 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-left">
                <Sparkles className="h-5 w-5 text-brand-600 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h4 className="text-[11px] font-semibold text-neutral-900 uppercase tracking-wide">Asistente Judicial e Investigativo</h4>
                  <p className="text-[10px] text-neutral-600 leading-relaxed mt-0.5">
                    Utiliza modelos de lenguaje configurados con las Circulares vigentes de la Superintendencia de Educación Chilena. Puede redactar informes, pautas, absolver dudas y fiscalizar plazos de Aula Segura.
                  </p>
                </div>
              </div>
              <AiAdvisor />
            </div>
          )}

          {/* VIEW 5: ALUMNOS */}
          {currentView === 'alumnos' && (
            <StudentsPanel privacyMode={privacyMode} />
          )}

        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-neutral-200/60 py-5 sm:py-6 mt-auto text-center text-[10px] text-neutral-400 space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-neutral-500 font-medium flex-wrap px-4">
            <span className="font-semibold text-brand-700">SigueAula</span>
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

      {/* ── Modal: Nuevo Expediente ── */}
      {showCreateForm && (
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
      )}
    </div>
  );
}