import { SupabaseClient } from '@supabase/supabase-js';
import { Student, Annotation, SupabaseConfig, CartaDisciplinaria, EtapaDisciplinaria } from '../types';
import { MOCK_STUDENTS, MOCK_ANNOTATIONS } from '../data/mockData';
import { calculateDisciplinaryStatus } from '../domain/disciplinaryStatus';
import { mapCartaRow, mapCausaRow, mapEtapaRow, mapInspectorateRow } from './mappers';
import { getBrowserSupabase, getEnvAnonKey, getEnvUrl } from './supabaseClient';

const STUDENTS_KEY = 'convivencia_local_students';
const ANNOTATIONS_KEY = 'convivencia_local_annotations';
const CONFIG_KEY = 'convivencia_supabase_config';

const DEFAULT_CONFIG: SupabaseConfig = {
  url: getEnvUrl(),
  anonKey: getEnvAnonKey(),
  useLocalStorageFallback: !(getEnvUrl() && getEnvAnonKey()),
  studentsTable: 'students',
  /** Fuente de verdad: inspectorate_records (no usar tabla legacy annotations). */
  annotationsTable: 'inspectorate_records',
  idCol: 'id',
  fullNameCol: 'full_name',
  courseCol: 'course_id',
  teacherCol: 'teacher_id',
  statusCol: 'status',
  tenantCol: 'tenant_id'
};

export { calculateDisciplinaryStatus };

export function getSavedConfig(): SupabaseConfig {
  const local = localStorage.getItem(CONFIG_KEY);
  const hasEnvVars = !!(getEnvUrl() && getEnvAnonKey());

  if (!local) {
    DEFAULT_CONFIG.url = getEnvUrl();
    DEFAULT_CONFIG.anonKey = getEnvAnonKey();
    DEFAULT_CONFIG.useLocalStorageFallback = !hasEnvVars;
    return DEFAULT_CONFIG;
  }
  try {
    const parsed = JSON.parse(local);
    const resolvedUrl = parsed.url || getEnvUrl();
    const resolvedAnonKey = parsed.anonKey || getEnvAnonKey();
    const fallback = parsed.useLocalStorageFallback !== undefined 
      ? parsed.useLocalStorageFallback 
      : !(resolvedUrl && resolvedAnonKey);

    return { 
      ...DEFAULT_CONFIG, 
      ...parsed,
      url: resolvedUrl,
      anonKey: resolvedAnonKey,
      useLocalStorageFallback: fallback,
      annotationsTable: 'inspectorate_records',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: SupabaseConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/** Cliente con sesión Auth persistida (RLS usa JWT del usuario). */
export function getSupabaseClient(_config?: SupabaseConfig): SupabaseClient | null {
  return getBrowserSupabase();
}

// Local Storage data managers (for fallback)
export function getLocalStudents(): Student[] {
  const local = localStorage.getItem(STUDENTS_KEY);
  if (!local) {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(MOCK_STUDENTS));
    return MOCK_STUDENTS;
  }
  return JSON.parse(local);
}

export function saveLocalStudents(students: Student[]) {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

export function getLocalAnnotations(): Annotation[] {
  const local = localStorage.getItem(ANNOTATIONS_KEY);
  if (!local) {
    localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(MOCK_ANNOTATIONS));
    return MOCK_ANNOTATIONS;
  }
  return JSON.parse(local);
}

export function saveLocalAnnotations(annotations: Annotation[]) {
  localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(annotations));
}

// Main repository functions with dynamic column mapping
export async function fetchAllStudents(config: SupabaseConfig): Promise<Student[]> {
  const client = getSupabaseClient(config);
  
  if (!client || config.useLocalStorageFallback) {
    // Re-calculate local student counts from annotations just in case
    const localStuds = getLocalStudents();
    const localAnns = getLocalAnnotations();
    const updated = localStuds.map(s => {
      const studentAnns = localAnns.filter(a => a.student_id === s.id);
      const negCount = studentAnns.filter(a => a.type === 'Negativa').length;
      const posCount = studentAnns.filter(a => a.type === 'Positiva').length;
      
      let lastDate = s.last_annotation_date;
      if (studentAnns.length > 0) {
        const sorted = [...studentAnns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastDate = sorted[0].date;
      }
      
      return {
        ...s,
        annotations_count: negCount,
        positive_annotations_count: posCount,
        last_annotation_date: lastDate,
        disciplinary_status: calculateDisciplinaryStatus(negCount)
      };
    });
    saveLocalStudents(updated);
    return updated;
  }

  try {
    // Fetch students from Supabase with course name resolved via join
    const { data: rawStudents, error: studentsError } = await client
      .from(config.studentsTable)
      .select('*, courses(name)');

    if (studentsError) throw studentsError;

    // Fuente de verdad: inspectorate_records
    const { data: rawAnnotations, error: annError } = await client
      .from('inspectorate_records')
      .select('*');

    let annotations: Annotation[] = [];
    if (annError) {
      console.warn(`[Supabase] inspectorate_records not available: ${annError.message}`);
    } else {
      annotations = (rawAnnotations || []).map((row) => mapInspectorateRow(row as Record<string, unknown>));
    }

    // Map rows dynamically - handle UUID course_id by resolving from join
    const mapped: Student[] = (rawStudents || []).map(row => {
      const studentId = String(row[config.idCol]);
      const studentAnnotations = annotations.filter(a => String(a.student_id) === studentId);
      const negCount = studentAnnotations.filter(a => a.type === 'Negativa').length;
      const posCount = studentAnnotations.filter(a => a.type === 'Positiva').length;
      
      let lastDate: string | undefined = undefined;
      if (studentAnnotations.length > 0) {
        const sorted = [...studentAnnotations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastDate = sorted[0].date;
      }

      // Resolve course name: if courses join returned data, use it; otherwise use raw course_id
      let courseName = 'Sin Curso';
      if (row.courses && typeof row.courses === 'object' && row.courses.name) {
        courseName = String(row.courses.name);
      } else if (row[config.courseCol]) {
        courseName = String(row[config.courseCol]);
      }

      return {
        id: studentId,
        full_name: String(row[config.fullNameCol] || 'Sin Nombre'),
        course_id: courseName,
        teacher_id: row[config.teacherCol] ? String(row[config.teacherCol]) : 'Sin Profesor',
        status: row[config.statusCol] ? String(row[config.statusCol]) : 'Activo',
        tenant_id: row[config.tenantCol] ? String(row[config.tenantCol]) : undefined,
        annotations_count: negCount,
        positive_annotations_count: posCount,
        last_annotation_date: lastDate,
        disciplinary_status: calculateDisciplinaryStatus(negCount),
        rut: row.rut ? String(row.rut) : undefined
      };
    });

    // Update our local cache as well so the user gets a consistent state
    saveLocalStudents(mapped);
    return mapped;
  } catch (error: any) {
    const details = error?.message || error?.hint || String(error);
    console.warn(`[Supabase] students query failed: ${details}`, error);
    throw error;
  }
}

export async function fetchAnnotations(config: SupabaseConfig, studentId?: string): Promise<Annotation[]> {
  const client = getSupabaseClient(config);

  if (!client || config.useLocalStorageFallback) {
    const all = getLocalAnnotations();
    return studentId ? all.filter(a => a.student_id === studentId) : all;
  }

  try {
    let query = client.from('inspectorate_records').select('*');
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    const { data, error } = await query;
    if (error) throw error;

    const mapped: Annotation[] = (data || []).map((row) =>
      mapInspectorateRow(row as Record<string, unknown>)
    );

    if (!studentId) {
      saveLocalAnnotations(mapped);
    }
    return mapped;
  } catch (error: any) {
    const details = error?.message || error?.hint || String(error);
    console.warn(`[Supabase] annotations fetch failed: ${details}`, error);
    throw error;
  }
}

// Write operation: Save a new Annotation
export async function saveAnnotation(config: SupabaseConfig, annotation: Annotation): Promise<boolean> {
  // Update local cache
  const annotations = getLocalAnnotations();
  annotations.push(annotation);
  saveLocalAnnotations(annotations);

  // Re-calculate and save student annotations count
  const students = getLocalStudents();
  const student = students.find(s => s.id === annotation.student_id);
  if (student) {
    if (annotation.type === 'Negativa') {
      student.annotations_count += 1;
    } else {
      student.positive_annotations_count += 1;
    }
    student.last_annotation_date = annotation.date;
    student.disciplinary_status = calculateDisciplinaryStatus(student.annotations_count);
    saveLocalStudents(students);
  }

  const client = getSupabaseClient(config);
  if (!client || config.useLocalStorageFallback) {
    return true;
  }

  try {
    const { error: annError } = await client
      .from('inspectorate_records')
      .insert({
        student_id: annotation.student_id,
        observation: annotation.text,
        date_time: annotation.date ? new Date(annotation.date).toISOString() : new Date().toISOString(),
        severity: annotation.severity,
        registered_by: annotation.registered_by,
        type: annotation.type,
      });

    if (annError) throw annError;

    // NOTE: Student counts (annotations_count, disciplinary_status) are computed
    // dynamically in fetchAllStudents by aggregating annotations. No extra update needed.

    return true;
  } catch (error) {
    console.warn('Supabase saveAnnotation failed, saved locally', error);
    return false;
  }
}

// Schema diagnostic tool
export async function testConnection(config: SupabaseConfig): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, message: 'La URL o la Clave Anon no pueden estar vacías.' };
  }

  try {
    const { data, error } = await client
      .from(config.studentsTable)
      .select('*, courses(name)')
      .limit(1);

    if (error) {
      return { success: false, message: `Error al acceder a la tabla '${config.studentsTable}': ${error.message}` };
    }

    // Verify essential columns exist
    if (data && data.length > 0) {
      const firstRow = data[0];
      const missingCols: string[] = [];
      
      if (!(config.idCol in firstRow)) missingCols.push(`ID (${config.idCol})`);
      if (!(config.fullNameCol in firstRow)) missingCols.push(`Nombre Completo (${config.fullNameCol})`);
      if (!(config.courseCol in firstRow)) missingCols.push(`Curso (${config.courseCol})`);

      // Check if courses join resolved
      const hasCourseName = firstRow.courses && typeof firstRow.courses === 'object' && firstRow.courses.name;

      if (missingCols.length > 0) {
        return { 
          success: true, 
          message: `¡Conexión establecida! Sin embargo, no se encontraron las siguientes columnas: ${missingCols.join(', ')}.` 
        };
      }

      const extras = [];
      if (!('teacher_id' in firstRow)) extras.push('teacher_id');
      if (!('status' in firstRow)) extras.push('status');
      if (!('tenant_id' in firstRow)) extras.push('tenant_id');
      
      const courseInfo = hasCourseName ? `Curso: ${firstRow.courses.name}` : `Course ID: ${firstRow[config.courseCol]}`;
      
      if (extras.length > 0) {
        return { 
          success: true, 
          message: `¡Conexión OK! Estudiante: ${firstRow[config.fullNameCol]}. Columnas no encontradas (se usan valores por defecto): ${extras.join(', ')}. ${courseInfo}` 
        };
      }
    }

    return { success: true, message: '¡Conexión y mapeo de columnas validados con éxito!' };
  } catch (error: any) {
    return { success: false, message: `Error de conexión: ${error.message || error}` };
  }
}

// Fetch Courses from Supabase table 'courses' or fallback
export async function fetchCourses(config: SupabaseConfig): Promise<string[]> {
  const client = getSupabaseClient(config);
  const getFallback = () => {
    const students = getLocalStudents();
    return Array.from(new Set(students.map(s => s.course_id))).sort();
  };

  if (!client || config.useLocalStorageFallback) {
    return getFallback();
  }

  try {
    const { data, error } = await client
      .from('courses')
      .select('name, id');
    
    if (error) {
      console.warn('Could not fetch from courses table, trying fallback to unique student courses', error);
      return getFallback();
    }

    if (data && data.length > 0) {
      return data.map((row: any) => String(row.name || row.id || '')).filter(Boolean).sort();
    }
    
    return getFallback();
  } catch (error) {
    console.warn('fetchCourses failed, falling back', error);
    return getFallback();
  }
}

// Fetch Disciplinary Cases from Supabase table 'causas' (real table) or 'disciplinary_cases' (legacy) or fallback
export async function fetchDisciplinaryCases(config: SupabaseConfig): Promise<any[]> {
  const CASES_KEY = 'convivencia_disciplinary_cases';
  const getLocalCases = () => {
    const local = localStorage.getItem(CASES_KEY);
    return local ? JSON.parse(local) : [];
  };

  const client = getSupabaseClient(config);
  if (!client || config.useLocalStorageFallback) {
    return getLocalCases();
  }

  try {
    // Try 'causas' first (real table in this Supabase project)
    let { data, error } = await client
      .from('causas')
      .select('*')
      .order('created_at', { ascending: false });

    // Fallback to 'disciplinary_cases' if causas doesn't exist
    if (error) {
      console.warn('[Supabase] causas not available, trying disciplinary_cases');
      const result = await client
        .from('disciplinary_cases')
        .select('*')
        .order('created_at', { ascending: false });
      data = result.data;
      error = result.error;
    }

    if (error) {
      const details = error?.message || error?.hint || String(error);
      console.warn(`[Supabase] disciplinary cases fetch failed: ${details}`, error);
      return getLocalCases();
    }

    const mapped = (data || []).map((row) => mapCausaRow(row as Record<string, unknown>));

    // Cache to localStorage for offline resilience
    localStorage.setItem(CASES_KEY, JSON.stringify(mapped));
    return mapped;
  } catch (error: any) {
    const details = error?.message || error?.hint || String(error);
    console.warn(`[Supabase] disciplinary cases query error: ${details}`, error);
    return getLocalCases();
  }
}

// Save Disciplinary Case to Supabase table 'causas' or fallback
export async function saveDisciplinaryCase(config: SupabaseConfig, caseData: any): Promise<boolean> {
  const CASES_KEY = 'convivencia_disciplinary_cases';
  
  // Update local cache
  const localCases = (() => {
    const local = localStorage.getItem(CASES_KEY);
    return local ? JSON.parse(local) : [];
  })();
  
  // Replace or append
  const idx = localCases.findIndex((c: any) => c.id === caseData.id);
  if (idx >= 0) {
    localCases[idx] = caseData;
  } else {
    localCases.push(caseData);
  }
  localStorage.setItem(CASES_KEY, JSON.stringify(localCases));

  const client = getSupabaseClient(config);
  if (!client || config.useLocalStorageFallback) {
    return true;
  }

  try {
    // Try saving to 'causas' table (real table)
    const causasRow = {
      id: caseData.id,
      student_id: caseData.student_id || null,
      estudiante_nombre: caseData.student_name || caseData.estudiante_nombre || 'Sin nombre',
      nna_protected_name: caseData.student_name || caseData.estudiante_nombre || 'NNA',
      run_estudiante: caseData.student_rut || caseData.run_estudiante || '',
      estudiante_curso: caseData.student_course || caseData.estudiante_curso || '',
      fecha_apertura: caseData.date_joined || caseData.fecha_apertura || new Date().toISOString().split('T')[0],
      estado_actual: caseData.initial_measure || caseData.estado_actual || 'Activo',
      tipo_infraccion: caseData.regulation_basis || caseData.tipo_infraccion || 'Leve',
      responsable: caseData.created_by || caseData.responsable || '',
      created_by: caseData.created_by || '',
      annotations_count: caseData.annotations_count_detected || caseData.annotations_count || 0,
      observaciones: caseData.ai_analysis_summary || caseData.observaciones || '',
      fecha_ultima_actualizacion: new Date().toISOString().split('T')[0],
      compromete_aula_segura: false,
    };

    const { error } = await client
      .from('causas')
      .upsert(causasRow);

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('Supabase saveDisciplinaryCase failed, saved locally', error);
    return false;
  }
}

// ============================================================
// Cartas Disciplinarias (Amonestación y Compromiso Conductual)
// ============================================================

const CARTAS_KEY = 'convivencia_cartas_disciplinarias';

export async function fetchCartas(config: SupabaseConfig, studentId?: string): Promise<CartaDisciplinaria[]> {
  const getLocalCartas = (): CartaDisciplinaria[] => {
    const local = localStorage.getItem(CARTAS_KEY);
    return local ? JSON.parse(local) : [];
  };

  const client = getSupabaseClient(config);
  if (!client || config.useLocalStorageFallback) {
    const local = getLocalCartas();
    return studentId ? local.filter(c => c.student_id === studentId) : local;
  }

  try {
    let query = client.from('cartas_disciplinarias').select('*');
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    query = query.order('emission_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    const mapped: CartaDisciplinaria[] = (data || []).map((row) =>
      mapCartaRow(row as Record<string, unknown>)
    );

    if (!studentId) {
      localStorage.setItem(CARTAS_KEY, JSON.stringify(mapped));
    }
    return mapped;
  } catch (error: any) {
    const details = error?.message || error?.hint || String(error);
    console.warn(`[Supabase] cartas_disciplinarias fetch failed: ${details}`, error);
    return getLocalCartas();
  }
}

export async function saveCarta(config: SupabaseConfig, carta: CartaDisciplinaria): Promise<boolean> {
  const localCartas = (() => {
    const local = localStorage.getItem(CARTAS_KEY);
    return local ? JSON.parse(local) : [];
  })();

  const idx = localCartas.findIndex((c: CartaDisciplinaria) => c.id === carta.id);
  if (idx >= 0) {
    localCartas[idx] = carta;
  } else {
    localCartas.push(carta);
  }
  localStorage.setItem(CARTAS_KEY, JSON.stringify(localCartas));

  const client = getSupabaseClient(config);
  if (!client || config.useLocalStorageFallback) {
    return true;
  }

  try {
    const dbRow = {
      id: carta.id,
      student_id: carta.student_id,
      letter_type: carta.letter_type,
      emission_date: carta.emission_date,
      status: carta.status,
      emitted_by: carta.emitted_by,
      supervisor_name: carta.supervisor_name,
      apoderado_name: carta.apoderado_name,
      annotations_count: carta.annotations_count,
      student_name: carta.student_name,
      course: carta.course,
      regulation_basis: carta.regulation_basis,
      observations: carta.observations
    };

    const { error } = await client
      .from('cartas_disciplinarias')
      .upsert(dbRow);

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('Supabase saveCarta failed, saved locally', error);
    return false;
  }
}

// ============================================================
// Etapas Disciplinarias (Historial de transiciones)
// ============================================================

const ETAPAS_KEY = 'convivencia_etapas_disciplinarias';

export async function fetchEtapas(config: SupabaseConfig, studentId: string): Promise<EtapaDisciplinaria[]> {
  const getLocalEtapas = (): EtapaDisciplinaria[] => {
    const local = localStorage.getItem(ETAPAS_KEY);
    if (!local) return [];
    const all: EtapaDisciplinaria[] = JSON.parse(local);
    return all.filter(e => e.student_id === studentId);
  };

  const client = getSupabaseClient(config);
  if (!client || config.useLocalStorageFallback) {
    return getLocalEtapas();
  }

  try {
    const { data, error } = await client
      .from('etapas_disciplinarias')
      .select('*')
      .eq('student_id', studentId)
      .order('transition_date', { ascending: true });

    if (error) throw error;

    const mapped: EtapaDisciplinaria[] = (data || []).map((row) =>
      mapEtapaRow(row as Record<string, unknown>)
    );

    return mapped;
  } catch (error: any) {
    const details = error?.message || error?.hint || String(error);
    console.warn(`[Supabase] etapas_disciplinarias fetch failed: ${details}`, error);
    return getLocalEtapas();
  }
}

export async function saveEtapa(config: SupabaseConfig, etapa: EtapaDisciplinaria): Promise<boolean> {
  const localEtapas = (() => {
    const local = localStorage.getItem(ETAPAS_KEY);
    return local ? JSON.parse(local) : [];
  })();

  localEtapas.push(etapa);
  localStorage.setItem(ETAPAS_KEY, JSON.stringify(localEtapas));

  const client = getSupabaseClient(config);
  if (!client || config.useLocalStorageFallback) {
    return true;
  }

  try {
    const dbRow = {
      id: etapa.id,
      student_id: etapa.student_id,
      step_number: etapa.step_number,
      stage_name: etapa.stage_name,
      responsible: etapa.responsible,
      transition_date: etapa.transition_date,
      comment: etapa.comment
    };

    const { error } = await client
      .from('etapas_disciplinarias')
      .insert(dbRow);

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('Supabase saveEtapa failed, saved locally', error);
    return false;
  }
}

