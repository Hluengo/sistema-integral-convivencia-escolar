/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type {
  Annotation,
  CartaDisciplinaria,
  DocumentAnalysis,
  EtapaDisciplinaria,
} from '../../../types';
import { mapCauseRowToCarta, mapInspectorateToAnnotation, mapStageRowToEtapa } from '../../../lib/mappers';
import { fetchAnnotations, fetchDocumentAnalyses } from './annotations.service';

export type CartaStatus = CartaDisciplinaria['status'];

export interface DisciplinaryProcessRecord {
  id: string;
  student_id: string;
  process_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  suggested_letter_type: string | null;
  final_letter_type: string | null;
  total_negativas: number;
  total_positivas: number;
  total_informativas: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface DisciplinaryFileRecord {
  id: string;
  process_id: string;
  student_id: string | null;
  file_name: string;
  original_file_name?: string | null;
  storage_path: string;
  bucket?: string | null;
  uploaded_at: string;
  processing_status?: string | null;
}

export interface DetectedAnnotationRecord {
  id: string;
  process_id: string;
  student_id: string;
  annotation_type: string;
  annotation_text: string | null;
  raw_text?: string | null;
  annotation_date?: string | null;
  detected_at: string;
}

export interface LetterOutputEvent {
  id: string;
  event_name: 'letter_printed' | 'letter_downloaded';
  properties: {
    cartaId?: string;
    studentId?: string;
    letterType?: string;
    status?: string;
  };
  created_at: string;
}

export interface StudentDisciplinarySnapshot {
  annotations: Annotation[];
  cartas: CartaDisciplinaria[];
  currentCarta: CartaDisciplinaria | null;
  documentAnalyses: DocumentAnalysis[];
  etapas: EtapaDisciplinaria[];
  processes: DisciplinaryProcessRecord[];
  files: DisciplinaryFileRecord[];
  detectedAnnotations: DetectedAnnotationRecord[];
  letterOutputEvents: LetterOutputEvent[];
  counts: {
    negativas: number;
    positivas: number;
    informativas: number;
  };
  lastAnalysis: DocumentAnalysis | null;
}

const CARTA_SELECT = '*';

export async function fetchCartas(studentId: string): Promise<CartaDisciplinaria[]> {
  return fetchCartasByStudent(studentId);
}

export async function fetchCartasByStudent(studentId: string): Promise<CartaDisciplinaria[]> {
  const { data, error } = await supabase
    .from('cartas_disciplinarias')
    .select(CARTA_SELECT)
    .eq('student_id', studentId)
    .order('emission_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cartas:', error);
    return [];
  }
  return (data || []).map(mapCauseRowToCarta);
}

export async function fetchCurrentCartaByStudent(studentId: string): Promise<CartaDisciplinaria | null> {
  const cartas = await fetchCartasByStudent(studentId);
  return cartas.find((carta) => carta.status === 'Vigente') || null;
}

export async function updateCartaStatus(
  cartaId: string,
  status: CartaStatus,
  reason?: string
): Promise<boolean> {
  const { data: current } = await supabase
    .from('cartas_disciplinarias')
    .select('observations')
    .eq('id', cartaId)
    .maybeSingle();

  const currentObservations = typeof current?.observations === 'string' ? current.observations : '';
  const reasonText = reason?.trim();
  const observations = reasonText
    ? `${currentObservations ? `${currentObservations}\n\n` : ''}Cambio de estado a ${status}: ${reasonText}`
    : currentObservations || null;

  const { error } = await supabase
    .from('cartas_disciplinarias')
    .update({ status, observations })
    .eq('id', cartaId);

  if (error) {
    console.error('Error updating carta status:', error);
    return false;
  }
  return true;
}

export async function annulCarta(cartaId: string, reason: string): Promise<boolean> {
  return updateCartaStatus(cartaId, 'Anulada', reason || 'Anulación administrativa');
}

async function fetchEtapasByStudent(studentId: string): Promise<EtapaDisciplinaria[]> {
  const { data, error } = await supabase
    .from('etapas_disciplinarias')
    .select('*')
    .eq('student_id', studentId)
    .order('transition_date', { ascending: false });

  if (error) {
    console.error('Error fetching etapas:', error);
    return [];
  }
  return (data || []).map(mapStageRowToEtapa);
}

async function fetchProcessesByStudent(studentId: string): Promise<DisciplinaryProcessRecord[]> {
  const { data, error } = await supabase
    .from('disciplinary_processes')
    .select('id,student_id,process_number,status,created_at,updated_at,suggested_letter_type,final_letter_type,total_negativas,total_positivas,total_informativas,is_completed,completed_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching disciplinary processes:', error);
    return [];
  }
  return (data || []) as DisciplinaryProcessRecord[];
}

async function fetchFilesByStudent(studentId: string): Promise<DisciplinaryFileRecord[]> {
  const { data, error } = await supabase
    .from('disciplinary_process_files')
    .select('id,process_id,student_id,file_name,original_file_name,storage_path,bucket,uploaded_at,processing_status')
    .eq('student_id', studentId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Error fetching disciplinary files:', error);
    return [];
  }
  return (data || []) as DisciplinaryFileRecord[];
}


async function fetchLetterOutputEventsByStudent(studentId: string): Promise<LetterOutputEvent[]> {
  const { data, error } = await supabase
    .from('usage_events')
    .select('id,event_name,properties,created_at')
    .in('event_name', ['letter_printed', 'letter_downloaded'])
    .eq('properties->>studentId', studentId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching letter output events:', error);
    return [];
  }
  return (data || []) as LetterOutputEvent[];
}
async function fetchDetectedAnnotationsByStudent(studentId: string): Promise<DetectedAnnotationRecord[]> {
  const { data, error } = await supabase
    .from('disciplinary_annotations_detected')
    .select('id,process_id,student_id,annotation_type,annotation_text,raw_text,annotation_date,detected_at')
    .eq('student_id', studentId)
    .order('detected_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching detected annotations:', error);
    return [];
  }
  return (data || []) as DetectedAnnotationRecord[];
}

export async function fetchStudentDisciplinarySnapshot(
  studentId: string
): Promise<StudentDisciplinarySnapshot> {
  const [
    annotations,
    cartas,
    documentAnalyses,
    etapas,
    processes,
    files,
    detectedAnnotations,
    letterOutputEvents,
  ] = await Promise.all([
    fetchAnnotations(studentId),
    fetchCartasByStudent(studentId),
    fetchDocumentAnalyses(studentId),
    fetchEtapasByStudent(studentId),
    fetchProcessesByStudent(studentId),
    fetchFilesByStudent(studentId),
    fetchDetectedAnnotationsByStudent(studentId),
    fetchLetterOutputEventsByStudent(studentId),
  ]);

  const counts = annotations.reduce(
    (acc, annotation) => {
      if (annotation.type === 'Negativa') acc.negativas += 1;
      if (annotation.type === 'Positiva') acc.positivas += 1;
      if (annotation.type === 'Información') acc.informativas += 1;
      return acc;
    },
    { negativas: 0, positivas: 0, informativas: 0 }
  );

  return {
    annotations,
    cartas,
    currentCarta: cartas.find((carta) => carta.status === 'Vigente') || null,
    documentAnalyses,
    etapas,
    processes,
    files,
    detectedAnnotations,
    letterOutputEvents,
    counts,
    lastAnalysis: documentAnalyses[0] || null,
  };
}

export async function refreshStudentDetailData(studentId: string): Promise<StudentDisciplinarySnapshot> {
  return fetchStudentDisciplinarySnapshot(studentId);
}

export async function fetchCartaAnnotations(carta: CartaDisciplinaria): Promise<Annotation[]> {
  const { data, error } = await supabase
    .from('inspectorate_records')
    .select('id,student_id,date_time,observation,severity,type,registered_by,created_at,created_by,pdf_file_path')
    .eq('student_id', carta.student_id)
    .eq('type', 'Negativa')
    .order('date_time', { ascending: false })
    .limit(Math.max(1, Number(carta.annotations_count) || 20));

  if (error) {
    console.error('Error fetching carta annotations:', error);
    return [];
  }
  return (data || []).map(mapInspectorateToAnnotation);
}