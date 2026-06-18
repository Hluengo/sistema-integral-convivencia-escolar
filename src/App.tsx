/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Causa, EstadoCausa, UserRole, FaseProcedimental } from './types';
import { INITIAL_CAUSAS, getFaseForEstado, getBaseChecklist } from './data';
import { REGLAMENTO_CONDUCTAS } from './reglamentoData';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import type { SidebarView } from './components/Sidebar';
import DashboardStats from './components/DashboardStats';
import CausaCard from './components/CausaCard';
import InteractiveTimeline from './components/InteractiveTimeline';
import AiAdvisor from './components/AiAdvisor';
import ClosedCases from './components/ClosedCases';
import { Search, Plus, RotateCcw, Scale, Sparkles, AlertCircle, FileText, BookOpen, ChevronRight, Loader2, Users, Cloud, Archive } from 'lucide-react';
import { supabase, type Course, type Student, fetchCausas, createCausa, updateCausa, saveBitacora, saveChecklist, clearAllData } from './lib/supabase';

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

  // Sidebar state
  const [currentView, setCurrentView] = useState<SidebarView>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Collapsible view layouts for workspace (ref: only set in handlers, never read in render)
  const isTimelineCollapsed = useRef(false);
  const setIsTimelineCollapsed = (val: boolean) => { isTimelineCollapsed.current = val; };

  // Search input state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New Causa Creation Form Modals / State
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newEstNombre, setNewEstNombre] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [newEstRut, setNewEstRut] = useState<string>('');
  const newEstCurso = courses.find(c => c.id === selectedCourseId)?.name ?? '';
  const [newInfTipo, setNewInfTipo] = useState<Causa['tipoInfraccion']>('Grave');
  const [newAulaSegura, setNewAulaSegura] = useState<boolean>(false);
  const [newObs, setNewObs] = useState<string>('');
  const [newResponsable, setNewResponsable] = useState<string>('Esteban Valenzuela (Encargado de Convivencia)');

  // Active vs Closed counts
  const activeCausas = causas.filter(c => c.estadoActual !== EstadoCausa.CAUSA_CERRADA);
  const closedCausas = causas.filter(c => c.estadoActual === EstadoCausa.CAUSA_CERRADA);
  const aulaSeguraCausas = causas.filter(c => c.comprometeAulaSegura && c.estadoActual !== EstadoCausa.CAUSA_CERRADA);

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
        // Clear any existing data from Supabase (from previous runs)
        await clearAllData();
        
        // Start from scratch
        console.log('Starting from scratch (cleared existing data)');
        setCausas([]);
        setSelectedCausaId('');
      } catch (error) {
        console.error('Error loading causas from Supabase:', error);
        // Start from scratch
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
      setNewEstNombre('');
      setNewEstRut('');
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (student) {
      setNewEstNombre(student.full_name);
      setNewEstRut(student.rut);
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
    setShowCreateForm(false);
    setCurrentView('casos_activos');

    // Reset fields
    setNewEstNombre('');
    setNewEstRut('');
    setNewObs('');
    setNewAulaSegura(false);
    setSelectedCourseId('');
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
    setCurrentView('casos_activos');
    setIsTimelineCollapsed(false);
  };

  // Reset to original mock database values
  const handleRestoreDatabase = () => {
    if (confirm("¿Está seguro de restaurar los datos del expediente a su estado original? Se perderán las causas que haya creado en esta sesión.")) {
      setCausas(INITIAL_CAUSAS);
      setSelectedCausaId(INITIAL_CAUSAS[0]?.id || '');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex font-sans text-neutral-800 antialiased">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view !== 'casos_activos') {
            setIsTimelineCollapsed(false);
          }
        }}
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
          currentView={currentView}
        />

        <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          {/* VIEW 1: DASHBOARD */}
          {currentView === 'dashboard' && (
            <div className="flex-1 space-y-6">
              <DashboardStats
                causas={causas}
                onFaseSelect={(fase) => {
                  setSelectedFaseFilter(fase);
                  setCurrentView('casos_activos');
                }}
                selectedFase={'Todas'}
              />

              {/* Quick actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentView('casos_activos')}
                  className="bg-white p-4 rounded-xl border border-neutral-200/80 hover:border-brand-300 hover:shadow-sm transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-50 rounded-lg text-brand-600 group-hover:bg-brand-100 transition-colors">
                      <Scale className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Casos Activos</p>
                      <p className="text-lg font-bold text-neutral-900">{activeCausas.length}</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentView('casos_cerrados')}
                  className="bg-white p-4 rounded-xl border border-neutral-200/80 hover:border-neutral-400 hover:shadow-sm transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-100 rounded-lg text-neutral-600 group-hover:bg-neutral-200 transition-colors">
                      <Archive className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Casos Cerrados</p>
                      <p className="text-lg font-bold text-neutral-900">{closedCausas.length}</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentView('advisor')}
                  className="bg-white p-4 rounded-xl border border-neutral-200/80 hover:border-brand-300 hover:shadow-sm transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-50 rounded-lg text-brand-600 group-hover:bg-brand-100 transition-colors">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Consultor IA</p>
                      <p className="text-sm font-bold text-neutral-900">Generar informes</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Recent active cases quick preview */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Casos activos recientes</h3>
                  <button
                    type="button"
                    onClick={() => setCurrentView('casos_activos')}
                    className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                  >
                    Ver todos <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeCausas.slice(0, 4).map((c) => (
                    <CausaCard
                      key={c.id}
                      causa={c}
                      privacyMode={privacyMode}
                      onSelect={(cause) => {
                        setSelectedCausaId(cause.id);
                        setCurrentView('casos_activos');
                        setIsTimelineCollapsed(false);
                      }}
                      isSelected={false}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ACTIVE CASES (workspace) */}
          {currentView === 'casos_activos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Sidebar with directory listing */}
              <div className={`lg:col-span-5 space-y-4 transition-all duration-300`}>
                
                {/* Directory Filter & Search Header */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                      <span>Expedientes Activos ({filteredCausas.length})</span>
                    </h3>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleRestoreDatabase}
                        className="text-[9px] text-neutral-500 hover:text-neutral-700 flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 font-medium transition-all cursor-pointer"
                        title="Restaurar base de datos"
                        aria-label="Restaurar datos iniciales"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        <span className="hidden sm:inline">Restaurar</span>
                      </button>

                      {currentRole !== 'docente' && (
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(!showCreateForm)}
                          className="text-[9px] bg-neutral-900 border border-neutral-950 text-white font-semibold py-1 px-2 rounded-lg flex items-center justify-center hover:bg-neutral-800 shadow-xs transition-all cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 mr-0.5" aria-hidden="true" />
                          <span className="hidden sm:inline">Nueva Causa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fase filter pills */}
                  <div className="flex gap-1.5 flex-wrap">
                    {(['Todas', 'Recepción', 'Investigación', 'Resolución', 'Impugnación', 'Seguimiento'] as const).map((fase) => (
                      <button
                        type="button"
                        key={fase}
                        onClick={() => setSelectedFaseFilter(fase)}
                        className={`text-[9px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          selectedFaseFilter === fase
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {fase}
                      </button>
                    ))}
                  </div>

                  {/* Search box */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar estudiante, curso o código..."
                      className="w-full bg-neutral-50 text-neutral-800 pl-9 pr-4 py-2 text-xs font-medium rounded-lg border border-neutral-200/80 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 focus:bg-white transition-all"
                      aria-label="Buscar expedientes"
                    />
                  </div>
                </div>

                {/* New Causa Creator */}
                {showCreateForm && (
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-neutral-200 shadow-lg animate-scale-in space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                      <h4 className="font-sans font-semibold text-sm text-neutral-900 flex items-center gap-2">
                        <Scale className="h-4 w-4 text-brand-600" aria-hidden="true" /> Nuevo Expediente
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="text-[10px] bg-neutral-50 hover:bg-neutral-100 px-2 py-1 rounded-lg text-neutral-500 hover:text-neutral-700 font-medium transition-all cursor-pointer"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <form onSubmit={handleCreateCausa} className="space-y-3.5 text-left text-xs text-neutral-800">
                      {/* Course selector - loaded from Supabase */}
                      <div>
                        <label htmlFor="create-course" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">
                          Curso del estudiante:
                        </label>
                        <select
                          id="create-course"
                          value={selectedCourseId}
                          onChange={(e) => {
                            setSelectedCourseId(e.target.value);
                            setNewEstNombre('');
                            setNewEstRut(''); 
                          }}
                          className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          required
                        >
                          <option value="">-- Seleccionar curso --</option>
                          {isLoadingCourses ? (
                            <option value="" disabled>Cargando cursos...</option>
                          ) : (
                            <>
                              {courses.filter(c => c.level === 'BASICA').length > 0 && (
                                <optgroup label="Enseñanza Básica" className="text-blue-700 font-semibold bg-white">
                                  {courses.filter(c => c.level === 'BASICA').map(c => (
                                    <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                                      {c.name}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {courses.filter(c => c.level === 'MEDIA').length > 0 && (
                                <optgroup label="Enseñanza Media" className="text-purple-700 font-semibold bg-white">
                                  {courses.filter(c => c.level === 'MEDIA').map(c => (
                                    <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                                      {c.name}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {courses.length === 0 && (
                                <option value="" disabled>No hay cursos disponibles</option>
                              )}
                            </>
                          )}
                        </select>
                      </div>

                      {/* Student selector - filtered by course */}
                      <div>
                        <label htmlFor="create-student" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">
                          Estudiante:
                        </label>
                        {selectedCourseId ? (
                          <>
                            {isLoadingStudents ? (
                              <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" />
                                <span className="text-[11px] text-neutral-500">Cargando estudiantes...</span>
                              </div>
                            ) : students.length > 0 ? (
                              <select
                                id="create-student"
                                value={students.find(s => s.full_name === newEstNombre)?.id || ''}
                                onChange={(e) => handleStudentSelect(e.target.value)}
                                className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                              >
                                <option value="">-- Seleccionar estudiante --</option>
                                {students.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.full_name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                                <span className="text-[11px] text-amber-800">No hay estudiantes en este curso</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200">
                            <Users className="h-3.5 w-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
                            <span className="text-[11px] text-neutral-500">Seleccione un curso primero</span>
                          </div>
                        )}
                      </div>

                      {/* RUT auto-filled */}
                      <div>
                        <label htmlFor="create-rut" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">RUN / RUT:</label>
                        <input
                          id="create-rut"
                          type="text"
                          required
                          value={newEstRut}
                          readOnly={!!selectedCourseId}
                          placeholder="Se auto-completa al seleccionar estudiante"
                          className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-100 font-medium text-neutral-600 focus:outline-none text-xs transition-all cursor-not-allowed"
                        />
                      </div>

                      {/* RICE Autocomplete */}
                      <div>
                        <label htmlFor="create-rice" className="block text-[9px] font-semibold text-brand-700 uppercase tracking-wide flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-brand-600" aria-hidden="true" />
                          Autocompletar desde Reglamento (RICE):
                        </label>
                        <select
                          id="create-rice"
                          onChange={(e) => {
                            const conductId = e.target.value;
                            const matched = REGLAMENTO_CONDUCTAS.find(c => c.id === conductId);
                            if (matched) {
                              setNewInfTipo(matched.gravedad);
                              setNewAulaSegura(matched.gravedad === 'Gravísima');
                              setNewObs(`Falta ${matched.gravedad} según el Reglamento del Colegio Carmela Romero. Artículo/Sección: ${matched.articulo} N° ${matched.numero}. Conducta: ${matched.conducta}\n\n[Medidas Formativas del RICE]:\n${matched.medidasFormativas.map(m => ` - ${m}`).join('\n')}\n\n[Medidas Disciplinarias del RICE]:\n${matched.medidasDisciplinarias.map(m => ` - ${m}`).join('\n')}`);
                            }
                          }}
                          className="w-full mt-1.5 border border-brand-200 rounded-lg p-2.5 bg-brand-50/20 text-[11px] font-medium text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          defaultValue=""
                        >
                          <option value="" className="text-neutral-500">-- Seleccionar conducta --</option>
                          <optgroup label="Faltas Leves (Art. 24)" className="text-blue-900 bg-white font-semibold">
                            {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Leve').map(c => (
                              <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                                Leve N° {c.numero}: {c.conducta.slice(0, 65)}...
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Faltas Graves (Art. 25)" className="text-amber-800 bg-white font-semibold">
                            {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Grave').map(c => (
                              <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                                Grave N° {c.numero}: {c.conducta.slice(0, 65)}...
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Faltas Muy Graves (Art. 26)" className="text-purple-800 bg-white font-semibold">
                            {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Muy Grave').map(c => (
                              <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                                Muy Grave N° {c.numero}: {c.conducta.slice(0, 65)}...
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Faltas Gravísimas (Aula Segura - Art. 27)" className="text-red-800 bg-white font-semibold">
                            {REGLAMENTO_CONDUCTAS.filter(c => c.gravedad === 'Gravísima').map(c => (
                              <option key={c.id} value={c.id} className="font-normal text-neutral-800">
                                Gravísima N° {c.numero}: {c.conducta.slice(0, 65)}...
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pb-2 border-b border-neutral-100">
                        <div>
                          <label htmlFor="create-gravedad" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">Gravedad:</label>
                          <select
                            id="create-gravedad"
                            value={newInfTipo}
                            onChange={(e) => setNewInfTipo(e.target.value as any)}
                            className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          >
                            <option value="Leve">Falta Leve</option>
                            <option value="Grave">Falta Grave</option>
                            <option value="Muy Grave">Falta Muy Grave</option>
                            <option value="Gravísima">Falta Gravísima</option>
                          </select>
                        </div>

                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 cursor-pointer font-medium text-neutral-700 transition hover:bg-neutral-100/60">
                            <input
                              type="checkbox"
                              checked={newAulaSegura}
                              onChange={(e) => setNewAulaSegura(e.target.checked)}
                              className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4 border-neutral-300"
                            />
                            <span className="text-[10px]">Afecta Aula Segura</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="create-obs" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">Relato de los Hechos:</label>
                        <textarea
                          id="create-obs"
                          rows={3}
                          required
                          placeholder="Relate minuciosamente los hechos ocurridos..."
                          value={newObs}
                          onChange={(e) => setNewObs(e.target.value)}
                          className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 leading-relaxed font-sans text-xs transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="create-responsable" className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">Fiscalizador a cargo:</label>
                        <input
                          id="create-responsable"
                          type="text"
                          required
                          value={newResponsable}
                          onChange={(e) => setNewResponsable(e.target.value)}
                          className="w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-100 font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      </div>

                      {newInfTipo === 'Gravísima' && newAulaSegura && (
                        <div className="bg-danger-50 p-3 rounded-lg border border-danger-200 text-[11px] text-danger-800 leading-normal font-sans font-medium">
                          ⚠️ <strong>Ley Aula Segura activa:</strong> Recuerde citar formalmente a la Superintendencia en un lapso de 24 horas y resolver en no más de 10 días hábiles de suspensión preventiva.
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="text-neutral-500 font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-50 transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="bg-brand-600 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-brand-700 flex items-center gap-1 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                        >
                          <FileText className="h-4 w-4" aria-hidden="true" /> Registrar
                        </button>
                      </div>
                    </form>
                  </div>
                )}

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
                        }}
                        isSelected={c.id === selectedCausaId}
                      />
                    ))
                  ) : (
                    <div className="bg-white p-8 text-center rounded-xl border border-neutral-200">
                      <Search className="h-8 w-8 text-neutral-300 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-xs text-neutral-500 font-medium">Ningún expediente coincide con la búsqueda o filtro.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Interactive details Timeline */}
              <div className="lg:col-span-7 h-full transition-all duration-300">
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
                  <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center text-neutral-400">
                    <Search className="h-10 w-10 mx-auto text-neutral-200 mb-2" aria-hidden="true" />
                    <p className="text-sm font-medium">Seleccione un expediente activo para ver sus detalles</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: CLOSED CASES */}
          {currentView === 'casos_cerrados' && (
            <div className="flex-1">
              <ClosedCases
                causas={causas}
                privacyMode={privacyMode}
                onReopenCausa={handleReopenCausa}
                onSelectCausa={(causa) => {
                  setSelectedCausaId(causa.id);
                  setCurrentView('casos_activos');
                  setIsTimelineCollapsed(false);
                }}
              />
            </div>
          )}

          {/* VIEW 4: AI ADVISOR */}
          {currentView === 'advisor' && (
            <div className="flex-1 max-w-3xl mx-auto space-y-4">
              <div className="bg-info-50/50 border border-info-100 p-3.5 sm:p-4 rounded-xl flex items-start gap-3 text-left">
                <Sparkles className="h-5 w-5 text-info-600 mt-0.5 shrink-0" aria-hidden="true" />
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

        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-neutral-200/60 py-5 sm:py-6 mt-8 text-center text-[10px] text-neutral-400 space-y-1">
          <div className="flex items-center justify-center gap-2 text-neutral-500 font-medium font-sans flex-wrap px-4">
            <span>SigueAula · Convivencia Escolar</span>
            <span className="hidden sm:inline" aria-hidden="true">•</span>
            <span className="hidden sm:inline">Fiscalización & Debido Proceso 2026</span>
            <span className="hidden sm:inline" aria-hidden="true">•</span>
            <span>Ministerio de Educación & Supereduc de Chile</span>
          </div>
          <p className="font-mono text-[9px] text-neutral-400 max-w-lg mx-auto leading-relaxed px-4">
            Circular N° 482 · Ley 21809 · Resguardo de NNA en todo el territorio nacional
          </p>
        </footer>
      </div>
    </div>
  );
}