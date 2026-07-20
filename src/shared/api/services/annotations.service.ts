/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type { Annotation, AnotacionStudent } from '../../../types';
import { mapInspectorateToAnnotation } from '../../../lib/mappers';
import { calculateDisciplinaryStatus } from '../../../domain/disciplinaryStatus';
import { useAuthStore } from '../../../stores/authStore';

const ANNOTATION_COLUMNS = 'id,student_id,date_time,observation,severity,type,registered_by,created_at,created_by';

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
  positive_count: number;
  last_annotation_date: string | null;
  disciplinary_status: string;
}

export async function fetchStudentsWithAnnotationCounts(): Promise<AnotacionStudent[]> {
  // 1. Try RPC (agregación server-side, single query)
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_student_annotation_summary');

  if (!rpcError && rpcData) {
    return (rpcData as RpcStudentSummary[]).map((row) => ({
      id: row.id,
      full_name: row.full_name,
      course_id: row.course_id,
      teacher_id: '',
      status: 'Activo',
      annotations_count: Number(row.annotations_count),
      positive_annotations_count: Number(row.positive_count),
      last_annotation_date: row.last_annotation_date || undefined,
      disciplinary_status: row.disciplinary_status as AnotacionStudent['disciplinary_status'],
      rut: row.rut || '',
      course_name: row.course_name || 'Sin curso',
    }));
  }

  // 2. Fallback: client-side aggregation (migration no ejecutada)
  console.warn('RPC get_student_annotation_summary no disponible, usando fallback:', rpcError?.message);

  const [studentsResult, annResult] = await Promise.all([
    supabase.from('students').select('*, courses(name, level)').order('full_name', { ascending: true }),
    supabase.from('inspectorate_records').select('student_id, type, date_time'),
  ]);

  const students = studentsResult.data;
  const allAnnotations = annResult.data;

  if (!students) {
    console.error('Error fetching students:', studentsResult.error);
    return [];
  }

  const annByStudent: Record<string, { type: string; date_time: string; student_id: string }[]> = {};
  for (const ann of allAnnotations || []) {
    if (!annByStudent[ann.student_id]) {
      annByStudent[ann.student_id] = [];
    }
    annByStudent[ann.student_id].push(ann);
  }

  return students.map((s: Record<string, unknown>) => {
    const studentAnns = annByStudent[s.id as string] || [];
    const negs = studentAnns.filter((a) => a.type === 'Negativa');
    const pos = studentAnns.filter((a) => a.type === 'Positiva');
    const negativeCount = negs.length;
    const sorted = [...negs].sort(
      (a: { date_time: string }, b: { date_time: string }) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
    );

    const courses = s.courses as { name: string; level: string } | null;
    return {
      id: s.id as string,
      full_name: s.full_name as string,
      course_id: s.course_id as string,
      teacher_id: (s.teacher_id as string) || '',
      status: (s.status as string) || 'Activo',
      annotations_count: negativeCount,
      positive_annotations_count: pos.length,
      last_annotation_date: sorted[0]?.date_time || undefined,
      disciplinary_status: calculateDisciplinaryStatus(negativeCount),
      rut: (s.rut as string) || '',
      course_name: courses?.name ?? 'Sin curso',
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
      amonestacionCount: students.filter((s) => s.annotations_count >= 5 && s.annotations_count < 10).length,
      compromisoCount: students.filter((s) => s.annotations_count >= 10 && s.annotations_count < 15).length,
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
