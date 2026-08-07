/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import {
  parseAnnotationStageRows,
  type AnnotationStageCounts,
} from '../../lib/domain/annotationStageCounts';
import type {
  StudentAnnotationRankingItem,
  TeacherAnnotationRankingItem,
} from '../../lib/domain/annotationRankings';
import type {
  Annotation,
  AnotacionStudent,
  DocumentAnalysis,
  TipoInfraccion,
} from '../../lib/types';
import { mapInspectorateToAnnotation } from '../../lib/mappers';
import { calculateDisciplinaryStatus } from '../../lib/domain/disciplinaryStatus';
import { getSessionTenantId } from '../lib/sessionContext';
import { withSupabaseReadRetry } from '../lib/supabaseRetry';

const ANNOTATION_COLUMNS =
  'id,student_id,date_time,observation,severity,type,registered_by,created_at,created_by,pdf_file_path';
const ANNUAL_ANNOTATION_TREND_COLUMNS = 'date_time,severity,type';
const DOCUMENT_ANALYSIS_COLUMNS =
  'id,student_id,file_name,negativas,positivas,informativas,analyzed_at,tenant_id,created_at,status';

interface AnnualAnnotationTrendRow {
  date_time: string;
  severity: TipoInfraccion;
  type: Annotation['type'];
}

export interface AnnualAnnotationTrendRecord {
  dateTime: string;
  severity: TipoInfraccion;
  type: Annotation['type'];
}

export interface UpdateAnnotationInput {
  id: string;
  text: string;
  date: string;
  severity: Annotation['severity'];
  type: Annotation['type'];
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

export async function updateAnnotation(input: UpdateAnnotationInput): Promise<Annotation> {
  const tenantId = getSessionTenantId();
  if (!tenantId) {
    throw new Error('No se pudo identificar el establecimiento de la sesión actual.');
  }

  const observation = input.text.trim();
  if (!observation) {
    throw new Error('La anotación no puede quedar vacía.');
  }

  const { data, error } = await supabase
    .from('inspectorate_records')
    .update({
      observation,
      date_time: input.date,
      severity: input.severity,
      type: input.type,
    })
    .eq('id', input.id)
    .eq('tenant_id', tenantId)
    .select(ANNOTATION_COLUMNS)
    .single();

  if (error) {
    throw new Error(`No se pudo actualizar la anotación: ${error.message}`);
  }

  return mapInspectorateToAnnotation(data);
}

export async function fetchAnnualAnnotationTrends(
  schoolYear: number,
): Promise<AnnualAnnotationTrendRecord[]> {
  const tenantId = getSessionTenantId();
  if (!tenantId) {
    throw new Error('No se pudo identificar el establecimiento de la sesión actual.');
  }
  if (!Number.isInteger(schoolYear) || schoolYear < 2000) {
    throw new Error('El año escolar solicitado no es válido.');
  }

  const rangeStart = `${schoolYear}-03-01T00:00:00.000Z`;
  const rangeEnd = `${schoolYear + 1}-01-01T00:00:00.000Z`;
  const { data, error } = await withSupabaseReadRetry(() =>
    supabase
      .from('inspectorate_records')
      .select(ANNUAL_ANNOTATION_TREND_COLUMNS)
      .eq('tenant_id', tenantId)
      .gte('date_time', rangeStart)
      .lt('date_time', rangeEnd)
      .order('date_time', { ascending: true }),
  );

  if (error) {
    console.error('Error fetching annual annotation trends:', error);
    throw new Error(`No se pudieron cargar las tendencias de anotaciones: ${error.message}`);
  }

  return ((data ?? []) as AnnualAnnotationTrendRow[]).map((row) => ({
    dateTime: row.date_time,
    severity: row.severity,
    type: row.type,
  }));
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

function mapAnnotationSummaryRows(rows: RpcStudentSummary[]): AnotacionStudent[] {
  return rows.map((row) => {
    const negativeCount = Number(row.annotations_count || 0);
    const positiveCount = Number(row.positive_annotations_count || 0);
    const informativeCount = Number(row.informative_annotations_count || 0);
    return {
      id: row.id,
      full_name: row.full_name,
      course_id: row.course_id,
      teacher_id: '',
      status: 'Activo',
      annotations_count: negativeCount,
      positive_annotations_count: positiveCount,
      informative_annotations_count: informativeCount,
      last_annotation_date: row.last_annotation_date || undefined,
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

export async function fetchStudentsWithAnnotationCounts(): Promise<AnotacionStudent[]> {
  const { data: rpcData, error: rpcError } = await withSupabaseReadRetry(() =>
    supabase.rpc('get_student_annotation_summary'),
  );

  if (rpcError || !rpcData) {
    const error = rpcError ?? new Error('La RPC get_student_annotation_summary no devolvió datos.');
    console.error('RPC get_student_annotation_summary no disponible:', error.message);
    throw error;
  }

  return mapAnnotationSummaryRows(rpcData as RpcStudentSummary[]);
}

/**
 * Lightweight RPC: returns the annotation stage counts for dashboard KPIs.
 * No usa fallback: los KPIs deben reflejar exclusivamente la fuente agregada
 * y tenant-scoped de PostgreSQL.
 */
export async function fetchAnnotationStageCounts(): Promise<AnnotationStageCounts> {
  const { data, error } = await supabase.rpc('get_annotation_stage_counts');
  if (error || !data) {
    const rpcError = error ?? new Error('La RPC get_annotation_stage_counts no devolvió datos.');
    console.error('RPC get_annotation_stage_counts no disponible:', rpcError.message);
    throw rpcError;
  }

  return parseAnnotationStageRows(
    data as Array<{
      stage: string;
      total_count: number | string;
      pending_count: number | string;
      processed_count: number | string;
    }>,
  );
}

/**
 * RPC: returns the top 5 teachers with the most negative annotations.
 * No usa fallback: una falla debe ser visible para no mezclar años o fuentes.
 */
export async function fetchTeacherAnnotationRanking(): Promise<TeacherAnnotationRankingItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_teacher_annotation_ranking');
    if (error || !data) throw error ?? new Error('No data returned from RPC');

    return (data as Array<Record<string, number | string>>).map((row) => ({
      teacher_name: String(row.teacher_name || 'Sin profesor'),
      negative_count: Number(row.negative_count) || 0,
      positive_count: Number(row.positive_count) || 0,
      informative_count: Number(row.informative_count) || 0,
      total_count: Number(row.total_count) || 0,
    }));
  } catch (err) {
    const rpcError =
      err instanceof Error ? err : new Error('RPC de ranking docente no disponible.');
    console.error('RPC get_teacher_annotation_ranking no disponible:', rpcError.message);
    throw rpcError;
  }
}

/**
 * RPC: returns the top 5 students with the most negative annotations.
 * No usa fallback: una falla debe ser visible para no mezclar años o fuentes.
 */
export async function fetchStudentAnnotationRanking(): Promise<StudentAnnotationRankingItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_student_annotation_ranking');
    if (error || !data) throw error ?? new Error('No data returned from RPC');

    return (data as Array<Record<string, unknown>>).map((row) => ({
      student_id: String(row.student_id || ''),
      student_name: String(row.student_name || 'Sin nombre'),
      course_name: String(row.course_name || 'Sin curso'),
      negative_count: Number(row.negative_count) || 0,
    }));
  } catch (err) {
    const rpcError =
      err instanceof Error ? err : new Error('RPC de ranking estudiantil no disponible.');
    console.error('RPC get_student_annotation_ranking no disponible:', rpcError.message);
    throw rpcError;
  }
}
