import { useState, useEffect } from 'react';
import { 
  BookOpen,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

// Types and data
import { 
  Student, 
  Annotation, 
  SupabaseConfig
} from './types';
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
  saveDisciplinaryCase
} from './lib/supabase';

// Components
import DashboardStats from './components/DashboardStats';
import StudentTable from './components/StudentTable';
import StudentDetailModal from './components/StudentDetailModal';
import NewDisciplinaryProcessModal from './components/NewDisciplinaryProcessModal';

export default function App() {
  // Application configurations (using saved Supabase details or demo fallback)
  const [dbConfig, setDbConfig] = useState<SupabaseConfig>(getSavedConfig());
  const [dbError, setDbError] = useState<string | null>(null);

  // Security & visual mask state
  const [privacyMode, setPrivacyMode] = useState<boolean>(true);

  // Core Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  // Loading & Selection States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState<boolean>(false);

  // Current user session
  const [currentUserEmail] = useState<string>(
    localStorage.getItem('convivencia_user_email') || 'usuario@mmddconcepcion.cl'
  );

  // Table filters states
  const [activeFilter, setActiveFilter] = useState<string>('con_registro');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pre-populate mock cases in localStorage for tracking
  useEffect(() => {
    const localCases = localStorage.getItem('convivencia_disciplinary_cases');
    if (!localCases) {
      const mockCases = [
        {
          id: 'case-mock-1',
          student_id: 'st-01',
          annotations_count_detected: 16,
          initial_measure: 'Evaluación por Equipo de Convivencia',
          regulation_basis: 'Artículo 24. BIS del RICE 2026 (3ra Acumulación - 15+ anotaciones)',
          created_by: 'convivencia_media@mmddconcepcion.cl',
          created_at: '2026-03-10T08:30:00Z',
          file_name: 'Hoja_De_Vida_Constanza_Retamal.pdf',
          analysis_summary: 'Estudiante presenta acumulación grave de anotaciones negativas (16 en total), escalando a falta grave según el Art. 24. BIS. Corresponde derivación urgente al Equipo de Convivencia y Coordinación de Ciclo.'
        },
        {
          id: 'case-mock-2',
          student_id: 'st-02',
          annotations_count_detected: 11,
          initial_measure: 'Carta de Compromiso Conductual',
          regulation_basis: 'Artículo 24. BIS del RICE 2026 (2da Acumulación - 10-14 anotaciones)',
          created_by: 'inspector_general@mmddconcepcion.cl',
          created_at: '2026-04-14T09:15:00Z',
          file_name: 'Ficha_Disciplinaria_Benjamin_Fuentes.pdf',
          analysis_summary: 'Se registran 11 anotaciones negativas por indisciplina y retrasos reiterados. Aplica citación del apoderado por Inspectoría para firmar Compromiso Conductual con seguimiento quincenal.'
        },
        {
          id: 'case-mock-3',
          student_id: 'st-03',
          annotations_count_detected: 6,
          initial_measure: 'Amonestación Escrita Formal',
          regulation_basis: 'Artículo 24. BIS del RICE 2026 (1ra Acumulación - 5-9 anotaciones)',
          created_by: 'profesor_jefe@mmddconcepcion.cl',
          created_at: '2026-05-02T11:00:00Z',
          file_name: 'Reporte_Lirmi_Sofia_Valenzuela.pdf',
          analysis_summary: 'Estudiante alcanza 6 anotaciones negativas de carácter leve. Se decreta citación al apoderado y formalización de amonestación escrita dirigida por el Profesor Jefe.'
        },
        {
          id: 'case-mock-4',
          student_id: 'st-04',
          annotations_count_detected: 15,
          initial_measure: 'Evaluación por Equipo de Convivencia',
          regulation_basis: 'Artículo 24. BIS del RICE 2026 (3ra Acumulación - 15+ anotaciones)',
          created_by: 'convivencia_basica@mmddconcepcion.cl',
          created_at: '2026-05-18T14:40:00Z',
          file_name: 'Hoja_Vida_Diego_Carrasco.pdf',
          analysis_summary: 'Estudiante alcanza un total de 15 anotaciones leves negativas. La conducta escala legalmente a falta grave conforme al Reglamento, procediendo plan de intervención conductual.'
        }
      ];
      localStorage.setItem('convivencia_disciplinary_cases', JSON.stringify(mockCases));
      // Notify components
      window.dispatchEvent(new Event('disciplinary-case-registered'));
    }
  }, []);

  // Global Sync handler
  const loadData = async (config = dbConfig) => {
    setIsLoading(true);
    setDbError(null);
    try {
      // If config enforces local fallback or config is missing, go directly to local
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
      console.warn('Unable to load core data from Supabase, falling back to local storage:', e);
      setDbError(e?.message || String(e));
      
      // Fallback gracefully to local storage
      setStudents(getLocalStudents());
      setAnnotations(getLocalAnnotations());
      try {
        await fetchDisciplinaryCases(config);
      } catch (innerErr) {
        console.warn('Failed to load cases too', innerErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount or configuration change
  useEffect(() => {
    loadData();
  }, [dbConfig]);

  const handleManualRefresh = () => {
    loadData();
  };

  // Save extracted annotations to database/local storage
  const handleAddAnnotations = async (newAnns: Annotation[]) => {
    for (const ann of newAnns) {
      await saveAnnotation(dbConfig, ann);
    }
    
    // Refresh core lists
    const updatedStudents = await fetchAllStudents(dbConfig);
    const updatedAnns = await fetchAnnotations(dbConfig);
    
    setStudents(updatedStudents);
    setAnnotations(updatedAnns);

    // Refresh modal student view
    if (selectedStudent) {
      const fresh = updatedStudents.find(s => s.id === selectedStudent.id);
      if (fresh) setSelectedStudent(fresh);
    }
  };

  // Handler for registering new disciplinary process (from the 7-step wizard)
  const handleRegisterDisciplinaryCase = async (
    studentId: string, 
    annotationsCount: number, 
    measure: string, 
    regulationBasis: string, 
    fileName: string, 
    aiRawResult: string,
    detectedAnns: any[]
  ) => {
    // 1. Create case object
    const newCase = {
      id: `case-${Date.now()}`,
      student_id: studentId,
      annotations_count_detected: annotationsCount,
      initial_measure: measure,
      regulation_basis: regulationBasis,
      created_by: currentUserEmail,
      created_at: new Date().toISOString(),
      file_name: fileName,
      analysis_summary: aiRawResult
    };

    // 2. Save case object to local storage and Supabase
    try {
      await saveDisciplinaryCase(dbConfig, newCase);
    } catch (e) {
      console.warn('Error saving case:', e);
    }

    // 3. Save detected annotations for that student to database/local storage
    const formattedAnns: Annotation[] = detectedAnns.map((ann: any, idx: number) => ({
      id: `ann-wizard-${Date.now()}-${idx}`,
      student_id: studentId,
      text: ann.text || ann.description || 'Anotación disciplinaria',
      date: ann.date || new Date().toISOString().split('T')[0],
      severity: ann.severity || 'Leve',
      registered_by: ann.registered_by || 'Inspectoría',
      type: ann.type === 'Positiva' ? 'Positiva' : 'Negativa'
    }));

    for (const ann of formattedAnns) {
      await saveAnnotation(dbConfig, ann);
    }

    // 4. Update student's annotations count and status in local storage student list
    const localStudents = getLocalStudents();
    const st = localStudents.find(s => s.id === studentId);
    if (st) {
      const negatives = formattedAnns.filter(a => a.type === 'Negativa');
      const positives = formattedAnns.filter(a => a.type === 'Positiva');
      st.annotations_count = formattedAnns.length; // Set or accumulate based on wizard logic
      st.positive_annotations_count = positives.length;
      st.last_annotation_date = new Date().toISOString().split('T')[0];
      
      const totalNegatives = st.annotations_count;
      if (totalNegatives < 5) st.disciplinary_status = 'Verde';
      else if (totalNegatives < 10) st.disciplinary_status = 'Amarillo';
      else if (totalNegatives < 15) st.disciplinary_status = 'Naranja';
      else st.disciplinary_status = 'Rojo';
    }
    saveLocalStudents(localStudents);

    // 5. Trigger database sync and reload UI
    await loadData();

    // 6. Dispatch custom event for components to reload cases list
    window.dispatchEvent(new Event('disciplinary-case-registered'));
  };

  // Clear student's annotations
  const handleClearAnnotations = async () => {
    if (!selectedStudent) return;
    
    // Remove from local storage
    const remaining = getLocalAnnotations().filter(a => a.student_id !== selectedStudent.id);
    saveLocalAnnotations(remaining);

    // Clear counts in students list
    const localStudents = getLocalStudents();
    const st = localStudents.find(s => s.id === selectedStudent.id);
    if (st) {
      st.annotations_count = 0;
      st.positive_annotations_count = 0;
      st.last_annotation_date = undefined;
      st.disciplinary_status = 'Verde';
    }
    saveLocalStudents(localStudents);

    // Sync database / state
    await loadData();

    // Update current detail modal state
    const fresh = localStudents.find(s => s.id === selectedStudent.id);
    if (fresh) setSelectedStudent(fresh);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col antialiased text-slate-800">
      
      {/* Top Banner Branding */}
      <header className="bg-white text-slate-900 border-b border-slate-200 shrink-0 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block">Sistema de Convivencia Escolar</span>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight font-display text-slate-900">
                GESTOR INTELIGENTE DE HOJAS DE VIDA
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">Colegio Carmela Romero de Espinosa • Extractor y Administrador de Hojas de Vida</p>
            </div>
          </div>

          {/* Top navigation tabs & privacy switcher */}
          <div className="flex items-center gap-3 self-start md:self-center">
            
            {/* Privacy toggle badge */}
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
          </div>
        </div>
      </header>

      {/* Main Container Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Header alert about sensitive student data protection */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 mb-6 border border-slate-800 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">Protección Integral de Datos de Menores (NNA)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">En conformidad con las directrices de privacidad y protección vigentes. Use el botón de privacidad para enmascarar identidades.</p>
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-wider bg-indigo-500/20 text-indigo-300 font-extrabold px-2 py-0.5 rounded border border-indigo-500/30">
            Normativa de Protección de Datos
          </span>
        </div>

        {/* Core application content dashboard view */}
        <div className="space-y-6">
          
          {/* Distribution by gravity */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">Distribución por Gravedad</h2>
                <p className="text-[11px] text-slate-500 font-medium">Etapa del proceso disciplinario según acumulación de anotaciones</p>
              </div>
            </div>
            <DashboardStats
              students={students}
              annotations={annotations}
            />
          </section>



          {/* Sheets list grid */}
          <StudentTable
            students={students}
            privacyMode={privacyMode}
            onSelectStudent={setSelectedStudent}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onRefresh={handleManualRefresh}
            isLoading={isLoading}
            onOpenNewProcess={() => setIsNewProcessModalOpen(true)}
          />

        </div>

      </main>

      {/* Footer bar */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-slate-400 text-[10px] sm:text-xs mt-auto shrink-0 shadow-2xs">
        <p className="font-semibold text-slate-500">© 2026 Colegio Carmela Romero de Espinosa. Todos los derechos reservados.</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Extractor y Administrador Inteligente de Hojas de Vida.</p>
      </footer>

      {/* 1. Modal: Detailed Student Dossier & PDF Parser */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          annotations={annotations.filter(a => a.student_id === selectedStudent.id)}
          privacyMode={privacyMode}
          onClose={() => setSelectedStudent(null)}
          onAddAnnotations={handleAddAnnotations}
          onClearAnnotations={handleClearAnnotations}
          onTogglePrivacy={() => setPrivacyMode(!privacyMode)}
        />
      )}

      {/* 2. Modal: Guided Wizard for New Disciplinary Case (AI Analysis) */}
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
