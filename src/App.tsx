/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  BookOpen,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  LogOut,
  Loader2,
} from 'lucide-react';

import { Student, Annotation, SupabaseConfig } from './types';
import {
  getSavedConfig,
  fetchAllStudents,
  fetchAnnotations,
  saveAnnotation,
  getLocalStudents,
  getLocalAnnotations,
  saveLocalStudents,
  saveLocalAnnotations,
  fetchDisciplinaryCases,
  saveDisciplinaryCase,
  saveEtapa,
} from './lib/supabase';
import { calculateDisciplinaryStatus } from './domain/disciplinaryStatus';
import { classifyByNegativeCount } from './domain/riceMeasures';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import DashboardStats from './components/DashboardStats';
import StudentTable from './components/StudentTable';
import StudentDetailModal from './components/StudentDetailModal';
import NewDisciplinaryProcessModal from './components/NewDisciplinaryProcessModal';

function AppShell() {
  const { profile, signOut, isDemo } = useAuth();
  const [dbConfig] = useState<SupabaseConfig>(getSavedConfig());
  const [privacyMode, setPrivacyMode] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('con_registro');
  const [searchQuery, setSearchQuery] = useState('');

  const currentUserEmail =
    profile?.email || localStorage.getItem('convivencia_user_email') || 'usuario@mmddconcepcion.cl';

  const loadData = async (config = dbConfig) => {
    setIsLoading(true);
    try {
      if (config.useLocalStorageFallback || !config.url || !config.anonKey) {
        setStudents(getLocalStudents());
        setAnnotations(getLocalAnnotations());
        await fetchDisciplinaryCases(config);
        return;
      }

      const studs = await fetchAllStudents(config);
      const anns = await fetchAnnotations(config);
      await fetchDisciplinaryCases(config);
      setStudents(studs);
      setAnnotations(anns);
    } catch (e: any) {
      console.warn('Fallback a localStorage:', e);
      setStudents(getLocalStudents());
      setAnnotations(getLocalAnnotations());
      try {
        await fetchDisciplinaryCases(config);
      } catch {
        /* ignore */
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dbConfig]);

  const handleAddAnnotations = async (newAnns: Annotation[]) => {
    for (const ann of newAnns) {
      await saveAnnotation(dbConfig, ann);
    }
    const updatedStudents = await fetchAllStudents(dbConfig);
    const updatedAnns = await fetchAnnotations(dbConfig);
    setStudents(updatedStudents);
    setAnnotations(updatedAnns);
    if (selectedStudent) {
      const fresh = updatedStudents.find((s) => s.id === selectedStudent.id);
      if (fresh) setSelectedStudent(fresh);
    }
  };

  const handleRegisterDisciplinaryCase = async (
    studentId: string,
    annotationsCount: number,
    measure: string,
    regulationBasis: string,
    fileName: string,
    aiRawResult: string,
    detectedAnns: any[]
  ) => {
    const student = students.find((s) => s.id === studentId) || getLocalStudents().find((s) => s.id === studentId);
    const newCase = {
      id: `DC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      student_id: studentId,
      student_name: student?.full_name || '',
      student_rut: student?.rut || '',
      student_course: student?.course_id || '',
      annotations_count_detected: annotationsCount,
      initial_measure: measure,
      regulation_basis: regulationBasis,
      created_by: currentUserEmail,
      created_at: new Date().toISOString(),
      file_name: fileName,
      analysis_summary: aiRawResult,
    };

    try {
      await saveDisciplinaryCase(dbConfig, newCase);
    } catch (e) {
      console.warn('Error saving case:', e);
    }

    const classification = classifyByNegativeCount(annotationsCount);
    try {
      await saveEtapa(dbConfig, {
        id: crypto.randomUUID(),
        student_id: studentId,
        step_number: classification.stepNumber,
        stage_name: classification.stageName,
        responsible: currentUserEmail,
        transition_date: new Date().toISOString(),
        comment: `Registro automático: ${measure}`,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Error saving etapa:', e);
    }

    const formattedAnns: Annotation[] = detectedAnns.map((ann: any, idx: number) => ({
      id: `ann-wizard-${Date.now()}-${idx}`,
      student_id: studentId,
      text: ann.text || ann.description || 'Anotación disciplinaria',
      date: ann.date || new Date().toISOString().split('T')[0],
      severity: ann.severity || 'Leve',
      registered_by: ann.registered_by || 'Inspectoría',
      type: ann.type === 'Positiva' ? 'Positiva' : 'Negativa',
    }));

    for (const ann of formattedAnns) {
      await saveAnnotation(dbConfig, ann);
    }

    const localStudents = getLocalStudents();
    const st = localStudents.find((s) => s.id === studentId);
    if (st) {
      const negatives = formattedAnns.filter((a) => a.type === 'Negativa');
      st.annotations_count = negatives.length;
      st.positive_annotations_count = formattedAnns.filter((a) => a.type === 'Positiva').length;
      st.last_annotation_date = new Date().toISOString().split('T')[0];
      st.disciplinary_status = calculateDisciplinaryStatus(st.annotations_count);
    }
    saveLocalStudents(localStudents);

    await loadData();
    window.dispatchEvent(new Event('disciplinary-case-registered'));
  };

  const handleClearAnnotations = async () => {
    if (!selectedStudent) return;
    const remaining = getLocalAnnotations().filter((a) => a.student_id !== selectedStudent.id);
    saveLocalAnnotations(remaining);
    const localStudents = getLocalStudents();
    const st = localStudents.find((s) => s.id === selectedStudent.id);
    if (st) {
      st.annotations_count = 0;
      st.positive_annotations_count = 0;
      st.last_annotation_date = undefined;
      st.disciplinary_status = 'Verde';
    }
    saveLocalStudents(localStudents);
    await loadData();
    const fresh = localStudents.find((s) => s.id === selectedStudent.id);
    if (fresh) setSelectedStudent(fresh);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col antialiased text-slate-800">
      <header className="bg-white text-slate-900 border-b border-slate-200 shrink-0 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block">
                Sistema de Convivencia Escolar
              </span>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight font-display text-slate-900">
                GESTOR INTELIGENTE DE HOJAS DE VIDA
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                Colegio Carmela Romero de Espinosa ·{' '}
                {profile?.role ? `Rol: ${profile.role}` : 'Sin rol'}
                {isDemo ? ' · Demo local' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <span className="hidden sm:inline text-[11px] text-slate-500 font-medium max-w-[180px] truncate">
              {currentUserEmail}
            </span>
            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                privacyMode
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
              }`}
            >
              {privacyMode ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  Privacidad NNA Activa
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  Ver Datos Reales
                </>
              )}
            </button>
            {!isDemo && (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                Salir
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 mb-6 border border-slate-800 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">Protección Integral de Datos de Menores (NNA)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                En conformidad con las directrices de privacidad vigentes. Use el botón de
                privacidad para enmascarar identidades.
              </p>
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-wider bg-indigo-500/20 text-indigo-300 font-extrabold px-2 py-0.5 rounded border border-indigo-500/30">
            Normativa de Protección de Datos
          </span>
        </div>

        <div className="space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">
                  Distribución por Gravedad
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Etapa del proceso disciplinario según acumulación de anotaciones
                </p>
              </div>
            </div>
            <DashboardStats students={students} annotations={annotations} />
          </section>

          <StudentTable
            students={students}
            privacyMode={privacyMode}
            onSelectStudent={setSelectedStudent}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onRefresh={() => loadData()}
            isLoading={isLoading}
            onOpenNewProcess={() => setIsNewProcessModalOpen(true)}
          />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-slate-400 text-[10px] sm:text-xs mt-auto shrink-0 shadow-2xs">
        <p className="font-semibold text-slate-500">
          © 2026 Colegio Carmela Romero de Espinosa. Todos los derechos reservados.
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Extractor y Administrador Inteligente de Hojas de Vida.
        </p>
      </footer>

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          annotations={annotations.filter((a) => a.student_id === selectedStudent.id)}
          privacyMode={privacyMode}
          onClose={() => setSelectedStudent(null)}
          onAddAnnotations={handleAddAnnotations}
          onClearAnnotations={handleClearAnnotations}
          onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
        />
      )}

      {isNewProcessModalOpen && (
        <NewDisciplinaryProcessModal
          students={students}
          onClose={() => setIsNewProcessModalOpen(false)}
          onRegisterCase={handleRegisterDisciplinaryCase}
          currentUserEmail={currentUserEmail}
        />
      )}
    </div>
  );
}

export default function App() {
  const { session, loading, isDemo } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const authenticated = isDemo || !!session;

  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/*"
        element={
          authenticated ? (
            <AppShell />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
