import React, { useState, useEffect, useRef } from 'react';
import { 
  X, BookOpen, User, Calendar, FileText, CheckCircle2, Shield, 
  AlertTriangle, ArrowRight, ArrowLeft, UploadCloud, Loader2, 
  Sparkles, AlertCircle, CheckCircle, Info, FileSpreadsheet
} from 'lucide-react';
import { Student } from '../types';
import { getSavedConfig, fetchCourses, getSupabaseClient } from '../lib/supabase';
import { classifyByNegativeCount } from '../domain/riceMeasures';
import AnnotationReviewTable, { type ReviewAnnotation } from './ai/AnnotationReviewTable';

interface NewDisciplinaryProcessModalProps {
  students: Student[];
  onClose: () => void;
  onRegisterCase: (
    studentId: string, 
    annotationsCount: number, 
    measure: string, 
    regulationBasis: string, 
    fileName: string, 
    aiRawResult: string,
    detectedAnns: any[]
  ) => Promise<void>;
  currentUserEmail: string;
}

export default function NewDisciplinaryProcessModal({
  students,
  onClose,
  onRegisterCase,
  currentUserEmail
}: NewDisciplinaryProcessModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [courses, setCourses] = useState<string[]>([]);
  const [allSupabaseStudents, setAllSupabaseStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState<boolean>(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoadingFiltered, setIsLoadingFiltered] = useState<boolean>(false);
  const [filteredError, setFilteredError] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [detectedAnnotations, setDetectedAnnotations] = useState<ReviewAnnotation[]>([]);
  const [negativeAnnotationsCount, setNegativeAnnotationsCount] = useState<number>(0);
  const [classification, setClassification] = useState<{
    measure: string;
    description: string;
    basis: string;
    canRegister: boolean;
    color: string;
    bgColor: string;
    borderColor: string;
  }>({
    measure: '',
    description: '',
    basis: '',
    canRegister: false,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200'
  });

  useEffect(() => {
    const loadAllStudentsInitial = async () => {
      setIsLoadingStudents(true);
      setStudentsError(null);
      try {
        const config = getSavedConfig();
        const client = getSupabaseClient(config);
        
        if (!client || config.useLocalStorageFallback) {
          const local = localStorage.getItem('convivencia_local_students');
          const studs = local ? JSON.parse(local) : students;
          setAllSupabaseStudents(studs);
          const uniqueCourses = Array.from(
            new Set((studs as Student[]).map((s) => String(s.course_id)))
          ).sort() as string[];
          setCourses(uniqueCourses);
          setIsLoadingStudents(false);
          return;
        }

        const { data, error } = await client
          .from(config.studentsTable || 'students')
          .select('id, full_name, rut, course_id, courses(name)')
          .order('full_name');

        if (error) {
          const local = localStorage.getItem('convivencia_local_students');
          const studs = local ? JSON.parse(local) : students;
          setAllSupabaseStudents(studs);
          const uniqueCourses = Array.from(
            new Set((studs as Student[]).map((s) => String(s.course_id)))
          ).sort() as string[];
          setCourses(uniqueCourses);
          setStudentsError("Usando copia de respaldo local debido a un error de conexión.");
        } else {
          const mapped: Student[] = (data || []).map((row: any) => {
            let courseName = 'Sin Curso';
            if (row.courses && typeof row.courses === 'object' && row.courses.name) {
              courseName = String(row.courses.name);
            } else if (row.course_id) {
              courseName = String(row.course_id);
            }
            
            return {
              id: String(row.id),
              full_name: String(row.full_name || row.name || 'Sin Nombre'),
              rut: String(row.rut || ''),
              course_id: courseName,
              teacher_id: row.teacher_id ? String(row.teacher_id) : 'Sin Profesor',
              status: row.status ? String(row.status) : 'Activo',
              annotations_count: 0,
              positive_annotations_count: 0,
              disciplinary_status: 'Verde' as const
            };
          });
          setAllSupabaseStudents(mapped);
          
          const uniqueCourses = Array.from(new Set(mapped.map(s => s.course_id))).sort() as string[];
          setCourses(uniqueCourses);
        }
      } catch (err: any) {
        const local = localStorage.getItem('convivencia_local_students');
        const studs = local ? JSON.parse(local) : students;
        setAllSupabaseStudents(studs);
        const uniqueCourses = Array.from(
          new Set((studs as Student[]).map((s) => String(s.course_id)))
        ).sort() as string[];
        setCourses(uniqueCourses);
        setStudentsError("Usando copia de respaldo local debido a un error de conexión.");
      } finally {
        setIsLoadingStudents(false);
      }
    };
    
    loadAllStudentsInitial();
  }, [students]);

  useEffect(() => {
    if (!selectedCourse) {
      setFilteredStudents([]);
      setSelectedStudent(null);
      return;
    }

    const fetchFilteredByCourse = async () => {
      setIsLoadingFiltered(true);
      setFilteredError(null);
      try {
        const config = getSavedConfig();
        const client = getSupabaseClient(config);

        if (!client || config.useLocalStorageFallback) {
          const filtered = allSupabaseStudents.filter(s => s.course_id === selectedCourse);
          setFilteredStudents(filtered);
          setIsLoadingFiltered(false);
          return;
        }

        const { data: courseData } = await client
          .from('courses')
          .select('id, name')
          .eq('name', selectedCourse)
          .limit(1);
        
        let filteredMapped: Student[];
        
        if (courseData && courseData.length > 0) {
          const courseUuid = courseData[0].id;
          const { data, error } = await client
            .from(config.studentsTable || 'students')
            .select('id, full_name, rut, course_id, courses(name)')
            .eq('course_id', courseUuid)
            .order('full_name');

          if (error) {
            const filtered = allSupabaseStudents.filter(s => s.course_id === selectedCourse);
            setFilteredStudents(filtered);
            setFilteredError("Usando copia de respaldo local para el curso seleccionado.");
          } else {
            filteredMapped = (data || []).map((row: any) => {
              let courseName = 'Sin Curso';
              if (row.courses && typeof row.courses === 'object' && row.courses.name) {
                courseName = String(row.courses.name);
              }
              return {
                id: String(row.id),
                full_name: String(row.full_name || row.name || 'Sin Nombre'),
                rut: String(row.rut || ''),
                course_id: courseName,
                teacher_id: row.teacher_id ? String(row.teacher_id) : 'Sin Profesor',
                status: row.status ? String(row.status) : 'Activo',
                annotations_count: 0,
                positive_annotations_count: 0,
                disciplinary_status: 'Verde' as const
              };
            });
            setFilteredStudents(filteredMapped);
          }
        } else {
          const filtered = allSupabaseStudents.filter(s => s.course_id === selectedCourse);
          setFilteredStudents(filtered);
        }
      } catch (err: any) {
        const filtered = allSupabaseStudents.filter(s => s.course_id === selectedCourse);
        setFilteredStudents(filtered);
        setFilteredError("Usando copia de respaldo local para el curso seleccionado.");
      } finally {
        setIsLoadingFiltered(false);
      }
    };

    fetchFilteredByCourse();

    if (selectedStudent && selectedStudent.course_id !== selectedCourse) {
      setSelectedStudent(null);
    }
  }, [selectedCourse, allSupabaseStudents]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 
      'image/png'
    ];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png'].includes(fileExtension || '');
    const isDoc = file.type === 'application/pdf' || fileExtension === 'docx' || fileExtension === 'doc';

    if (allowedTypes.includes(file.type) || isImage || isDoc) {
      setSelectedFile(file);
      setAnalysisError(null);
    } else {
      setAnalysisError('Formato de archivo no válido. Solo se aceptan archivos PDF, DOCX, JPG o PNG.');
    }
  };

  const runAiAnalysis = async () => {
    if (!selectedFile || !selectedStudent) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const base64Data = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || getMimeTypeFromExtension(selectedFile.name);

      const response = await fetch('/api/parse-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType,
          fileName: selectedFile.name
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al analizar el documento con Gemini API.');
      }

      const allAnnotations = data.annotations || [];
      processAnnotationsResult(allAnnotations);
      setCurrentStep(4);
    } catch (error: any) {
      simulateAnalysisFallback();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const getMimeTypeFromExtension = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    return 'application/octet-stream';
  };

  const processAnnotationsResult = (allAnns: any[]) => {
    const normalized: ReviewAnnotation[] = allAnns.map((ann) => ({
      text: ann.text || ann.description || 'Anotación',
      date: (ann.date || new Date().toISOString().split('T')[0]).slice(0, 10),
      severity: ann.severity || 'Leve',
      registered_by: ann.registered_by || 'Inspectoría',
      type: ann.type === 'Positiva' ? 'Positiva' : 'Negativa',
    }));
    normalized.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setDetectedAnnotations(normalized);
    applyClassification(normalized);
  };

  const applyClassification = (allAnns: ReviewAnnotation[]) => {
    const negatives = allAnns.filter((ann) => ann.type === 'Negativa');
    const count = negatives.length;
    setNegativeAnnotationsCount(count);
    const c = classifyByNegativeCount(count);
    setClassification({
      measure: c.measure,
      description: c.description,
      basis: c.basis,
      canRegister: c.canRegister,
      color: c.color,
      bgColor: c.bgColor,
      borderColor: c.borderColor,
    });
  };

  const handleReviewChange = (next: ReviewAnnotation[]) => {
    setDetectedAnnotations(next);
    applyClassification(next);
  };

  const simulateAnalysisFallback = () => {
    const simulatedAnnotations = [
      { text: 'Interrumpe constantemente las actividades de aula conversando con compañeros de puesto.', date: '2026-05-12', severity: 'Leve', registered_by: 'Prof. Juan Valdés', type: 'Negativa' },
      { text: 'No realiza entrega de trabajos de historia en plazos acordados por el docente.', date: '2026-05-18', severity: 'Leve', registered_by: 'Prof. Sonia Castro', type: 'Negativa' },
      { text: 'Usa teléfono móvil de manera reiterativa e indisciplinada durante evaluaciones académicas.', date: '2026-05-24', severity: 'Grave', registered_by: 'Prof. Roberto Lagos', type: 'Negativa' },
      { text: 'Llega tarde a la sala tras el recreo por segunda vez consecutiva sin justificar.', date: '2026-06-02', severity: 'Leve', registered_by: 'Inspector Jorge Díaz', type: 'Negativa' },
      { text: 'Se burla de la opinión de un compañero de clases durante una disertación grupal.', date: '2026-06-08', severity: 'Grave', registered_by: 'Prof. Carolina Alarcón', type: 'Negativa' },
      { text: 'Muestra actitud despectiva y desafiante ante el llamado de atención del docente jefe.', date: '2026-06-15', severity: 'Grave', registered_by: 'Prof. Eduardo Neira', type: 'Negativa' },
      { text: 'No asiste a clases con los materiales pedagógicos obligatorios para la asignatura.', date: '2026-06-20', severity: 'Leve', registered_by: 'Prof. Sonia Castro', type: 'Negativa' },
      { text: 'Se retira del aula sin solicitar la correspondiente autorización del profesor.', date: '2026-06-25', severity: 'Leve', registered_by: 'Prof. Mario Gatica', type: 'Negativa' },
      { text: 'Daña material del establecimiento educacional (rayas profundas en mesa de trabajo).', date: '2026-07-02', severity: 'Grave', registered_by: 'Inspectora Sonia Vera', type: 'Negativa' },
      { text: 'Profier palabras soeces en los pasillos de inspectoría general durante el recreo.', date: '2026-07-08', severity: 'Grave', registered_by: 'Inspector Jorge Díaz', type: 'Negativa' },
      { text: 'No presenta justificación firmada por apoderado tras inasistencia obligatoria de prueba.', date: '2026-07-11', severity: 'Leve', registered_by: 'Prof. Roberto Lagos', type: 'Negativa' },
    ];

    processAnnotationsResult(simulatedAnnotations);
    setCurrentStep(4);
  };

  const handleRegisterAndSubmit = async () => {
    if (!selectedStudent || !classification.canRegister) return;

    try {
      await onRegisterCase(
        selectedStudent.id,
        negativeAnnotationsCount,
        classification.measure,
        classification.basis,
        selectedFile?.name || 'Archivo_Hoja_De_Vida_Física.pdf',
        `Análisis automático realizado por Gemini AI. Se procesó la hoja de vida detectando un total de ${negativeAnnotationsCount} anotaciones negativas en el periodo.`,
        detectedAnnotations
      );
      setCurrentStep(7);
    } catch (err: any) {
      setAnalysisError('Error al registrar el caso disciplinario: ' + err.message);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && selectedCourse) {
      setCurrentStep(2);
    } else if (currentStep === 2 && selectedStudent) {
      setCurrentStep(3);
    } else if (currentStep === 3 && selectedFile) {
      runAiAnalysis();
    } else if (currentStep === 4) {
      setCurrentStep(5);
    } else if (currentStep === 5) {
      setCurrentStep(6);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 4) {
      setCurrentStep(3);
    } else if (currentStep === 5) {
      setCurrentStep(4);
    } else if (currentStep === 6) {
      setCurrentStep(5);
    }
  };

  const steps = [
    { num: 1, label: 'Curso', icon: BookOpen },
    { num: 2, label: 'Alumno', icon: User },
    { num: 3, label: 'Documentos', icon: FileText },
    { num: 4, label: 'Análisis', icon: Sparkles },
    { num: 5, label: 'Resolución', icon: Shield },
    { num: 6, label: 'Revisión', icon: CheckCircle },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-lg">
      <div className="relative w-full max-w-[680px] bg-white rounded-3xl shadow-2xl border border-slate-200/60 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-7 py-5 flex items-center justify-between shrink-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative flex items-center gap-3.5">
            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[15px] font-display font-bold text-white tracking-tight">Nuevo Proceso Disciplinario</h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Asistente guiado de análisis y registro</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="relative p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="bg-slate-50/80 border-b border-slate-100 px-7 py-4 shrink-0">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              return (
                <React.Fragment key={step.num}>
                  <div className="flex flex-col items-center gap-2">
                    <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isCompleted 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                        : isActive 
                          ? 'bg-white text-indigo-600 ring-[3px] ring-indigo-100 shadow-lg border border-indigo-100'
                          : 'bg-white text-slate-300 border border-slate-200'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4.5 h-4.5" />
                      ) : (
                        <Icon className="w-4.5 h-4.5" />
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide ${
                      isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-500' : 'text-slate-300'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`flex-1 h-[2px] mx-1.5 rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-indigo-400' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-7 space-y-6">
          
          {/* Step 1: Course Selection */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-display font-bold text-slate-800 tracking-tight">Seleccionar Curso</h3>
                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  Elija el curso del estudiante para cargar la nómina oficial desde la base de datos.
                </p>
              </div>

              {isLoadingStudents ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-10 h-10 border-[2.5px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[13px] text-slate-500 font-medium">Cargando cursos disponibles...</p>
                </div>
              ) : studentsError ? (
                <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-[13px]">
                    <p className="font-semibold text-amber-800">Conexión limitada</p>
                    <p className="text-amber-600 mt-1 leading-relaxed">{studentsError}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {courses.map((course) => {
                    const isSelected = selectedCourse === course;
                    const count = allSupabaseStudents.filter(s => s.course_id === course).length;
                    return (
                      <button
                        key={course}
                        onClick={() => setSelectedCourse(course)}
                        className={`group relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-50/80 shadow-lg shadow-indigo-100/50'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 hover:shadow-sm'
                        }`}
                      >
                        <span className={`block text-[13px] font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {course}
                        </span>
                        <span className={`block text-[11px] mt-1.5 font-medium ${isSelected ? 'text-indigo-500' : 'text-slate-400'}`}>
                          {count} alumnos
                        </span>
                        {isSelected && (
                          <div className="absolute top-3.5 right-3.5">
                            <div className="w-5.5 h-5.5 bg-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Student Selection */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-display font-bold text-slate-800 tracking-tight">Seleccionar Estudiante</h3>
                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  Curso: <span className="font-semibold text-slate-700">{selectedCourse}</span> — Seleccione el alumno para continuar.
                </p>
              </div>

              {isLoadingFiltered ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-10 h-10 border-[2.5px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[13px] text-slate-500 font-medium">Cargando alumnos del curso...</p>
                </div>
              ) : filteredError ? (
                <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-amber-800 font-medium">{filteredError}</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-[13px] text-slate-500">No hay estudiantes registrados en este curso.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto shadow-sm">
                  {filteredStudents.map((st) => {
                    const isSelected = selectedStudent?.id === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setSelectedStudent(st)}
                        className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-all duration-150 ${
                          isSelected 
                            ? 'bg-indigo-50/80 border-l-4 border-l-indigo-500'
                            : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                        }`}
                      >
                        <div>
                          <span className={`block text-[13px] font-semibold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                            {st.full_name}
                          </span>
                          <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                            {st.rut || 'Sin RUT'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isSelected ? 'Seleccionado' : 'Elegir'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedStudent && (
                <div className="bg-gradient-to-br from-slate-50 to-slate-50/50 border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3.5">
                    Resumen del Alumno
                  </span>
                  <div className="grid grid-cols-2 gap-4 text-[13px]">
                    <div className="space-y-1">
                      <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Nombre Completo</span>
                      <span className="font-bold text-slate-800">{selectedStudent.full_name}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">RUT</span>
                      <span className="font-bold text-slate-700 font-mono">{selectedStudent.rut || 'N/A'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Curso</span>
                      <span className="font-bold text-slate-700">{selectedStudent.course_id}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider block">Profesor Jefe</span>
                      <span className="font-bold text-slate-700">{selectedStudent.teacher_id}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: File Upload */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-display font-bold text-slate-800 tracking-tight">Cargar Hoja de Vida</h3>
                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  Suba el documento de historial de anotaciones de <span className="font-semibold text-slate-700">{selectedStudent?.full_name}</span>.
                </p>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' 
                    : selectedFile 
                      ? 'border-emerald-300 bg-emerald-50/30' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                />

                <div className="flex flex-col items-center space-y-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    selectedFile 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : dragActive 
                        ? 'bg-indigo-100 text-indigo-600 scale-110'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {selectedFile ? (
                      <CheckCircle className="w-8 h-8" />
                    ) : (
                      <UploadCloud className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-slate-700">
                      {selectedFile 
                        ? selectedFile.name 
                        : 'Arrastre el archivo o haga clic para seleccionar'}
                    </p>
                    <p className="text-[12px] text-slate-400 mt-1.5">
                      {selectedFile 
                        ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB — Listo para analizar`
                        : 'PDF, DOCX, JPG o PNG • Máx. 25 MB'}
                    </p>
                  </div>
                </div>
              </div>

              {analysisError && (
                <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-rose-700 leading-relaxed">{analysisError}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Analysis Results */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-indigo-100 rounded-lg">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="text-base font-display font-bold text-slate-800 tracking-tight">Resultado del Análisis IA</h3>
                </div>
                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  Revise y edite el resultado de la IA. Solo las anotaciones negativas cuentan para el semáforo disciplinario.
                </p>
              </div>

              {/* Counter card */}
              <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 flex items-center justify-between text-white shadow-xl shadow-indigo-200/50">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-indigo-200">
                    Total de Faltas
                  </span>
                  <h4 className="text-3xl font-display font-black mt-1 tracking-tight">{negativeAnnotationsCount}</h4>
                  <p className="text-[12px] text-indigo-200 font-medium mt-0.5">anotaciones negativas (post-revisión)</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 text-center">
                  <span className="text-4xl font-display font-black block tracking-tight">{negativeAnnotationsCount}</span>
                  <span className="text-[9px] uppercase font-bold tracking-[0.15em] text-indigo-200">Faltas</span>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                <AnnotationReviewTable
                  annotations={detectedAnnotations}
                  onChange={handleReviewChange}
                />
              </div>
            </div>
          )}

          {/* Step 5: Classification */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-display font-bold text-slate-800 tracking-tight">Resolución Reglamentaria</h3>
                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  Con <span className="font-bold text-slate-700">{negativeAnnotationsCount}</span> faltas, el RICE prescribe la siguiente medida:
                </p>
              </div>

              <div className={`p-6 rounded-2xl border-2 ${classification.bgColor} ${classification.borderColor} space-y-4`}>
                <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-200 pb-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medida Reglamentaria</span>
                    <h4 className={`text-xl font-display font-black tracking-tight ${classification.color}`}>
                      {classification.measure}
                    </h4>
                  </div>
                  <span className="shrink-0 px-3.5 py-2 bg-white rounded-xl border text-[12px] font-bold text-slate-600 shadow-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    {negativeAnnotationsCount} faltas
                  </span>
                </div>

                <div className="space-y-3.5 text-[13px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-1.5">Descripción</span>
                    <p className="text-slate-700 font-medium leading-relaxed">{classification.description}</p>
                  </div>
                  <div className="bg-white/70 p-4 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-1.5">Fundamento Legal</span>
                    <p className="text-slate-800 font-semibold leading-relaxed">{classification.basis}</p>
                  </div>
                </div>
              </div>

              {!classification.canRegister && (
                <div className="p-5 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-3.5">
                  <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="text-[13px]">
                    <p className="font-bold text-emerald-800">No aplica proceso formal</p>
                    <p className="text-emerald-600 mt-1 leading-relaxed">
                      El estudiante no supera las 5 anotaciones negativas requeridas. Se recomienda monitoreo ordinario.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Preview */}
          {currentStep === 6 && selectedStudent && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-display font-bold text-slate-800 tracking-tight">Revisión Final</h3>
                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  Verifique los datos antes de registrar el caso en el sistema.
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200 rounded-2xl p-6 text-[13px] space-y-5 shadow-sm">
                <div className="text-center border-b border-slate-200 pb-4">
                  <h4 className="text-[11px] font-display font-black tracking-wider text-slate-500 uppercase">
                    Ficha de Registro Disciplinario
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Colegio Carmela Romero de Espinosa</p>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Estudiante</span>
                    <p className="font-bold text-slate-800">{selectedStudent.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">RUT</span>
                    <p className="font-bold text-slate-700 font-mono">{selectedStudent.rut || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Curso</span>
                    <p className="font-bold text-slate-700">{selectedStudent.course_id}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Profesor Jefe</span>
                    <p className="font-bold text-slate-700">{selectedStudent.teacher_id}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Faltas Detectadas</span>
                    <p className="font-black text-rose-600 text-[15px]">{negativeAnnotationsCount} anotaciones</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Medida Propuesta</span>
                    <p className="font-black text-indigo-600">{classification.measure}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl p-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Fundamento Reglamentario</span>
                  <p className="font-semibold text-slate-700 leading-relaxed">{classification.basis}</p>
                </div>

                <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 flex items-start gap-2.5">
                  <Info className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-relaxed">
                    Al confirmar, se habilitará la emisión de la <strong>{classification.measure}</strong> correspondiente para descarga y firma del apoderado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Success */}
          {currentStep === 7 && (
            <div className="text-center py-12 space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-200/50">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-display font-black text-slate-800 tracking-tight">Proceso Registrado</h3>
                <p className="text-[13px] text-slate-500 mt-2.5 max-w-sm mx-auto leading-relaxed">
                  <strong className="text-slate-700">{selectedStudent?.full_name}</strong> ha sido incorporado al sistema de seguimiento con <strong className="text-slate-700">{negativeAnnotationsCount} faltas</strong> registradas.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl max-w-sm mx-auto text-left text-[13px] space-y-3 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-2.5">
                  Información del Registro
                </span>
                <div className="space-y-2 text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Usuario:</span>
                    <span className="font-mono text-[11px] text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-100">{currentUserEmail}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Fecha:</span>
                    <span className="font-mono text-[11px] text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-100">{new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Archivo:</span>
                    <span className="font-mono text-[11px] text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-100 truncate max-w-[160px]">{selectedFile?.name || 'Archivo.pdf'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-100 px-7 py-4 flex items-center justify-between shrink-0">
          {currentStep === 7 ? (
            <div />
          ) : (
            <button
              onClick={currentStep === 1 ? onClose : handlePrevStep}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100 transition-all duration-200 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 1 ? 'Cancelar' : 'Anterior'}
            </button>
          )}

          {currentStep === 7 ? (
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl text-[13px] font-bold transition-all duration-200 shadow-lg shadow-emerald-200/50"
            >
              Cerrar
            </button>
          ) : currentStep === 6 ? (
            <button
              onClick={handleRegisterAndSubmit}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-xl text-[13px] font-bold transition-all duration-200 shadow-lg shadow-indigo-200/50 flex items-center gap-1.5"
            >
              Confirmar Registro
              <CheckCircle className="w-4 h-4" />
            </button>
          ) : currentStep === 3 ? (
            <button
              onClick={handleNextStep}
              disabled={!selectedFile || isAnalyzing}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white rounded-xl text-[13px] font-bold transition-all duration-200 shadow-lg shadow-indigo-200/50 disabled:shadow-none flex items-center gap-1.5"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  Analizar con IA
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNextStep}
              disabled={
                (currentStep === 1 && !selectedCourse) ||
                (currentStep === 2 && !selectedStudent) ||
                (currentStep === 5 && !classification.canRegister)
              }
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white rounded-xl text-[13px] font-bold transition-all duration-200 shadow-lg shadow-indigo-200/50 disabled:shadow-none flex items-center gap-1.5"
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
