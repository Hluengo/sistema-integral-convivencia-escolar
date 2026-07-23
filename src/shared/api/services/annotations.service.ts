/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type { Annotation, AnotacionStudent, DocumentAnalysis } from '../../../types';
import { mapInspectorateToAnnotation } from '../../../lib/mappers';
import { calculateDisciplinaryStatus } from '../../../domain/disciplinaryStatus';
import { useAuthStore } from '../../../stores/authStore';

const ANNOTATION_COLUMNS =
  'id,student_id,date_time,observation,severity,type,registered_by,created_at,created_by,pdf_file_path';
const DOCUMENT_ANALYSIS_COLUMNS =
  'id,student_id,file_name,negativas,positivas,informativas,analyzed_at,tenant_id,created_at';

interface AnnotationCountStats {
  negativas: number;
  positivas: number;
  informativas: number;
  lastDate?: string;
}

export async function fetchAnnotations(studentId?: string): Promise<Annotation[]> {
  let query = supabase
    .from('inspectorate_records')
    .select(ANNOTATION_COLUMNS)
    .order('date_time', { ascending: false });

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching annotations:', error);
    return [];
  }
  return (data || []).map(mapInspectorateToAnnotation);
}

export async function fetchDocumentAnalyses(studentId: string): Promise<DocumentAnalysis[]> {
  const { data, error } = await supabase
    .from('document_analyses')
    .select(DOCUMENT_ANALYSIS_COLUMNS)
    .eq('student_id', studentId)
    .order('analyzed_at', { ascending: false });

  if (error) {
    console.error('Error fetching document analyses:', error);
    return [];
  }
  return (data || []) as DocumentAnalysis[];
}

export async function saveDocumentAnalysis(params: {
  studentId: string;
  fileName?: string;
  negativas: number;
  positivas: number;
  informativas: number;
}): Promise<boolean> {
  const tenantId = useAuthStore.getState().tenantId;
  const { error } = await supabase.from('document_analyses').insert({
    student_id: params.studentId,
    file_name: params.fileName || null,
    negativas: params.negativas,
    positivas: params.positivas,
    informativas: params.informativas,
    tenant_id: tenantId,
  });

  if (error) {
    console.error('Error saving document analysis:', error);
    return false;
  }
  return true;
}

export async function saveAnnotation(annotation: {
  student_id: string;
  observation: string;
  severity: string;
  type: string;
  registered_by: string;
}): Promise<boolean> {
  const tenantId = useAuthStore.getState().tenantId;
  const { error } = await supabase.from('inspectorate_records').insert({
    student_id: annotation.student_id,
    date_time: new Date().toISOString(),
    observation: annotation.observation,
    severity: annotation.severity,
    type: annotation.type,
    registered_by: annotation.registered_by,
    tenant_id: tenantId,
  });

  if (error) {
    console.error('Error saving annotation:', error);
    return false;
  }
  return true;
}

interface RpcStudentSummary {
  id: string;
  full_name: string;
  course_id: string;
  rut: string;
  course_name: string;
  annotations_count: number;
  positive_annotations_count: number;
  informative_annotations_count?: number;
  last_annotation_date: string | null;
  disciplinary_status: string;
  ai_analysis: Record<string, number> | null;
}

function addAnnotationToStats(
  stats: Record<string, AnnotationCountStats>,
  annotation: { student_id: string; type: string; date_time: string | null }
) {
  const studentStats = stats[annotation.student_id] || {
    negativas: 0,
    positivas: 0,
    informativas: 0,
    lastDate: undefined,
  };

  if (annotation.type === 'Negativa') studentStats.negativas += 1;
  if (annotation.type === 'Positiva') studentStats.positivas += 1;
  if (annotation.type === 'Información') studentStats.informativas += 1;

  if (annotation.date_time) {
    const current = studentStats.lastDate ? new Date(studentStats.lastDate).getTime() : 0;
    const next = new Date(annotation.date_time).getTime();
    if (next > current) studentStats.lastDate = annotation.date_time;
  }

  stats[annotation.student_id] = studentStats;
}

async function fetchAnnotationStatsByStudent(): Promise<Record<string, AnnotationCountStats>> {
  const { data, error } = await supabase
    .from('inspectorate_records')
    .select('student_id,type,date_time');

  if (error) {
    console.error('Error fetching annotation stats:', error);
    return {};
  }

  const stats: Record<string, AnnotationCountStats> = {};
  for (const annotation of data || []) {
    addAnnotationToStats(
      stats,
      annotation as { student_id: string; type: string; date_time: string | null }
    );
  }
  return stats;
}

export async function fetchStudentsWithAnnotationCounts(): Promise<AnotacionStudent[]> {
  const [summaryResult, statsByStudent] = await Promise.all([
    supabase.rpc('get_student_annotation_summary'),
    fetchAnnotationStatsByStudent(),
  ]);
  const { data: rpcData, error: rpcError } = summaryResult;

  if (!rpcError && rpcData) {
    return (rpcData as RpcStudentSummary[]).map((row) => {
      const stats = statsByStudent[row.id];
      const negativeCount = stats?.negativas ?? Number(row.annotations_count || 0);
      const positiveCount = stats?.positivas ?? Number(row.positive_annotations_count || 0);
      const informativeCount =
        stats?.informativas ?? Number(row.informative_annotations_count || 0);
      return {
        id: row.id,
        full_name: row.full_name,
        course_id: row.course_id,
        teacher_id: '',
        status: 'Activo',
        annotations_count: negativeCount,
        positive_annotations_count: positiveCount,
        informative_annotations_count: informativeCount,
        last_annotation_date: stats?.lastDate || row.last_annotation_date || undefined,
        disciplinary_status: calculateDisciplinaryStatus(negativeCount),
        rut: row.rut || '',
        course_name: row.course_name || 'Sin curso',
        ai_analysis: row.ai_analysis
          ? {
              negativas: Number(row.ai_analysis.negativas) || 0,
              positivas: Number(row.ai_analysis.positivas) || 0,
              informativas: Number(row.ai_analysis.informativas) || 0,
            }
          : undefined,
      };
    });
  }

  console.warn(
    'RPC get_student_annotation_summary no disponible, usando fallback:',
    rpcError?.message
  );

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id,full_name,course_id,teacher_id,status,rut,ai_analysis,courses(name, level)')
    .order('full_name', { ascending: true });

  if (!students) {
    console.error('Error fetching students:', studentsError);
    return [];
  }

  return students.map((s: Record<string, unknown>) => {
    const stats = statsByStudent[s.id as string] || {
      negativas: 0,
      positivas: 0,
      informativas: 0,
      lastDate: undefined,
    };
    const courses = s.courses as { name: string; level: string } | null;
    const rawAi = s.ai_analysis as Record<string, number> | null;
    return {
      id: s.id as string,
      full_name: s.full_name as string,
      course_id: s.course_id as string,
      teacher_id: (s.teacher_id as string) || '',
      status: (s.status as string) || 'Activo',
      annotations_count: stats.negativas,
      positive_annotations_count: stats.positivas,
      informative_annotations_count: stats.informativas,
      last_annotation_date: stats.lastDate,
      disciplinary_status: calculateDisciplinaryStatus(stats.negativas),
      rut: (s.rut as string) || '',
      course_name: courses?.name ?? 'Sin curso',
      ai_analysis: rawAi
        ? {
            negativas: Number(rawAi.negativas) || 0,
            positivas: Number(rawAi.positivas) || 0,
            informativas: Number(rawAi.informativas) || 0,
          }
        : undefined,
    };
  });
}

/**
 * Lightweight RPC: only returns 3 counts for dashboard KPIs.
 * Falls back to counting from fetchStudentsWithAnnotationCounts if RPC unavailable.
 */
export async function fetchAnnotationStageCounts(): Promise<{
  amonestacionCount: number;
  compromisoCount: number;
  derivacionCount: number;
}> {
  const fallback = async () => {
    const students = await fetchStudentsWithAnnotationCounts();
    return {
      amonestacionCount: students.filter(
        (s) => s.annotations_count >= 5 && s.annotations_count < 10
      ).length,
      compromisoCount: students.filter((s) => s.annotations_count >= 10 && s.annotations_count < 15)
        .length,
      derivacionCount: students.filter((s) => s.annotations_count >= 15).length,
    };
  };

  try {
    const { data, error } = await supabase.rpc('get_annotation_stage_counts');
    if (error || !data) return fallback();

    const result = { amonestacionCount: 0, compromisoCount: 0, derivacionCount: 0 };
    for (const row of data as Array<{ stage: string; count: number }>) {
      if (row.stage === 'amonestacion') result.amonestacionCount = Number(row.count);
      else if (row.stage === 'compromiso') result.compromisoCount = Number(row.count);
      else if (row.stage === 'derivacion') result.derivacionCount = Number(row.count);
    }
    return result;
  } catch {
    return fallback();
  }
}
