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
import {
  mapCauseRowToCarta,
  mapInspectorateToAnnotation,
  mapStageRowToEtapa,
} from '../../../lib/mappers';
import { fetchAnnotations, fetchDocumentAnalyses } from './annotations.service';
import { useAuthStore } from '../../../stores/authStore';
import type { LetterType } from '../../lib/domain/disciplinaryStage';

export type CartaStatus = CartaDisciplinaria['status'];
export type CartaWorkflowStatus = 'pending' | 'completed' | 'annulled';

export type CartaEventType =
  | 'suggested'
  | 'created'
  | 'registered'
  | 'printed'
  | 'downloaded_pdf'
  | 'downloaded_word'
  | 'processed_manually'
  | 'annulled';

export interface CartaEvent {
  id: string;
  carta_id: string;
  student_id: string;
  event_type: CartaEventType;
  event_detail: string | null;
  created_by: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

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
  cartaEvents: CartaEvent[];
  counts: {
    negativas: number;
    positivas: number;
    informativas: number;
  };
  lastAnalysis: DocumentAnalysis | null;
}

const CARTA_SELECT =
  'id,student_id,letter_type,emission_date,status,emitted_by,supervisor_name,apoderado_name,annotations_count,student_name,course,regulation_basis,observations,created_at,content_snapshot';
const CARTA_EVENT_SELECT =
  'id,carta_id,student_id,event_type,event_detail,created_by,created_at,metadata';
const COMPLETION_EVENTS: CartaEventType[] = [
  'registered',
  'printed',
  'downloaded_pdf',
  'downloaded_word',
  'processed_manually',
];

function latestEvent(events: CartaEvent[], type: CartaEventType): CartaEvent | undefined {
  return events.find((event) => event.event_type === type);
}

function hydrateCartaWorkflow(carta: CartaDisciplinaria, events: CartaEvent[]): CartaDisciplinaria {
  const cartaEvents = events
    .filter((event) => event.carta_id === carta.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const annulled = latestEvent(cartaEvents, 'annulled');
  const processed = latestEvent(cartaEvents, 'processed_manually');
  const completed = COMPLETION_EVENTS.some((type) => latestEvent(cartaEvents, type));
  return {
    ...carta,
    workflow_status:
      carta.status === 'Anulada' || annulled ? 'annulled' : completed ? 'completed' : 'pending',
    suggested_at: latestEvent(cartaEvents, 'suggested')?.created_at ?? null,
    created_event_at: latestEvent(cartaEvents, 'created')?.created_at ?? null,
    registered_at: latestEvent(cartaEvents, 'registered')?.created_at ?? null,
    printed_at: latestEvent(cartaEvents, 'printed')?.created_at ?? null,
    downloaded_pdf_at: latestEvent(cartaEvents, 'downloaded_pdf')?.created_at ?? null,
    downloaded_word_at: latestEvent(cartaEvents, 'downloaded_word')?.created_at ?? null,
    processed_manually_at: processed?.created_at ?? null,
    processed_note: processed?.event_detail ?? null,
    annulled_at: annulled?.created_at ?? null,
    annulled_reason: annulled?.event_detail ?? null,
  };
}

export function resolveCartaWorkflowStatus(
  carta: CartaDisciplinaria | null | undefined
): CartaWorkflowStatus | 'none' {
  if (!carta) return 'none';
  if (carta.status === 'Anulada' || carta.annulled_at) return 'annulled';
  if (
    carta.printed_at ||
    carta.downloaded_pdf_at ||
    carta.downloaded_word_at ||
    carta.registered_at ||
    carta.processed_manually_at
  ) {
    return 'completed';
  }
  return 'pending';
}

export function getCartaWorkflowLabel(carta: CartaDisciplinaria | null | undefined): string {
  const status = resolveCartaWorkflowStatus(carta);
  if (status === 'none') return 'Sin carta requerida';
  if (status === 'completed') return 'Carta realizada';
  if (status === 'annulled') return 'Carta anulada';
  return carta?.suggested_at ? 'Carta sugerida' : 'Carta pendiente';
}

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

  const cartas = (data || []).map(mapCauseRowToCarta);
  const cartaEvents = await fetchCartaEventsByStudent(studentId);
  return cartas.map((carta) => hydrateCartaWorkflow(carta, cartaEvents));
}

export async function fetchCurrentCartaByStudent(
  studentId: string
): Promise<CartaDisciplinaria | null> {
  const cartas = await fetchCartasByStudent(studentId);
  return cartas.find((carta) => carta.status !== 'Anulada') || null;
}

async function fetchCartaForEvent(
  cartaId: string
): Promise<{ student_id: string; tenant_id?: string | null } | null> {
  const { data, error } = await supabase
    .from('cartas_disciplinarias')
    .select('student_id,tenant_id')
    .eq('id', cartaId)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching carta for event:', error);
    return null;
  }
  return data as { student_id: string; tenant_id?: string | null };
}

export async function createCartaEvent(
  cartaId: string,
  eventType: CartaEventType,
  detail?: string,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  const carta = await fetchCartaForEvent(cartaId);
  if (!carta) return false;

  const tenantId = carta.tenant_id || useAuthStore.getState().tenantId;
  const user = useAuthStore.getState().user;
  const { error } = await supabase.from('carta_events').insert({
    carta_id: cartaId,
    student_id: carta.student_id,
    tenant_id: tenantId,
    event_type: eventType,
    event_detail: detail || null,
    created_by: user?.email || user?.id || null,
    metadata,
  });

  if (error) {
    console.error('Error creating carta event:', error);
    return false;
  }
  return true;
}

export async function markCartaPrinted(cartaId: string): Promise<boolean> {
  return createCartaEvent(cartaId, 'printed', 'Carta impresa desde ficha disciplinaria');
}

export async function markCartaDownloadedPdf(cartaId: string): Promise<boolean> {
  return createCartaEvent(
    cartaId,
    'downloaded_pdf',
    'Carta descargada en PDF desde ficha disciplinaria'
  );
}

export async function markCartaDownloadedWord(cartaId: string): Promise<boolean> {
  return createCartaEvent(
    cartaId,
    'downloaded_word',
    'Carta descargada en Word desde ficha disciplinaria'
  );
}

export async function markCartaProcessedManually(cartaId: string, note: string): Promise<boolean> {
  return createCartaEvent(
    cartaId,
    'processed_manually',
    note || 'Trámite marcado como procesado manualmente'
  );
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
  const ok = await updateCartaStatus(cartaId, 'Anulada', reason || 'Anulación administrativa');
  if (!ok) return false;
  return createCartaEvent(cartaId, 'annulled', reason || 'Anulación administrativa');
}

export async function createPendingCartaForStudent(params: {
  student: { id: string; full_name: string; course_id: string; course_name?: string | null };
  letterType: LetterType;
  negativeCount: number;
  source: 'supabase' | 'pdf';
  sourceProcessId?: string | null;
  sourceAnalysisId?: string | null;
}): Promise<CartaDisciplinaria | null> {
  const tenantId = useAuthStore.getState().tenantId;
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('cartas_disciplinarias')
    .insert({
      student_id: params.student.id,
      tenant_id: tenantId,
      letter_type: params.letterType,
      emission_date: today,
      status: 'Vigente',
      emitted_by: 'Inspectoría',
      supervisor_name: null,
      apoderado_name: 'Pendiente',
      annotations_count: params.negativeCount,
      student_name: params.student.full_name,
      course: params.student.course_name || params.student.course_id,
      regulation_basis: 'RICE 2026 - Fundación Educacional Colegio Carmela Romero de Espinosa',
      observations: `Carta pendiente sugerida por conteo ${params.source === 'pdf' ? 'del PDF' : 'de Supabase'}.`,
    })
    .select(CARTA_SELECT)
    .single();

  if (error || !data) {
    console.error('Error creating pending carta:', error);
    return null;
  }

  const carta = mapCauseRowToCarta(data);
  await createCartaEvent(
    carta.id,
    'suggested',
    `Carta sugerida por conteo ${params.source === 'pdf' ? 'del PDF' : 'de Supabase'}`,
    {
      source: params.source,
      negativeCount: params.negativeCount,
      sourceProcessId: params.sourceProcessId || null,
      sourceAnalysisId: params.sourceAnalysisId || null,
    }
  );
  return hydrateCartaWorkflow(carta, await fetchCartaEventsByStudent(params.student.id));
}

async function fetchEtapasByStudent(studentId: string): Promise<EtapaDisciplinaria[]> {
  const { data, error } = await supabase
    .from('etapas_disciplinarias')
    .select('id,student_id,step_number,stage_name,responsible,transition_date,comment,created_at')
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
    .select(
      'id,student_id,process_number,status,created_at,updated_at,suggested_letter_type,final_letter_type,total_negativas,total_positivas,total_informativas,is_completed,completed_at'
    )
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
    .select(
      'id,process_id,student_id,file_name,original_file_name,storage_path,bucket,uploaded_at,processing_status'
    )
    .eq('student_id', studentId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Error fetching disciplinary files:', error);
    return [];
  }
  return (data || []) as DisciplinaryFileRecord[];
}

export async function fetchCartaEventsByStudent(studentId: string): Promise<CartaEvent[]> {
  const { data, error } = await supabase
    .from('carta_events')
    .select(CARTA_EVENT_SELECT)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching carta events:', error);
    return [];
  }
  return (data || []) as CartaEvent[];
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

async function fetchDetectedAnnotationsByStudent(
  studentId: string
): Promise<DetectedAnnotationRecord[]> {
  const { data, error } = await supabase
    .from('disciplinary_annotations_detected')
    .select(
      'id,process_id,student_id,annotation_type,annotation_text,raw_text,annotation_date,detected_at'
    )
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
    rawCartas,
    documentAnalyses,
    etapas,
    processes,
    files,
    detectedAnnotations,
    letterOutputEvents,
    cartaEvents,
  ] = await Promise.all([
    fetchAnnotations(studentId),
    fetchCartasByStudent(studentId),
    fetchDocumentAnalyses(studentId),
    fetchEtapasByStudent(studentId),
    fetchProcessesByStudent(studentId),
    fetchFilesByStudent(studentId),
    fetchDetectedAnnotationsByStudent(studentId),
    fetchLetterOutputEventsByStudent(studentId),
    fetchCartaEventsByStudent(studentId),
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

  const cartas = rawCartas.map((carta) => hydrateCartaWorkflow(carta, cartaEvents));

  return {
    annotations,
    cartas,
    currentCarta: cartas.find((carta) => carta.status !== 'Anulada') || null,
    documentAnalyses,
    etapas,
    processes,
    files,
    detectedAnnotations,
    letterOutputEvents,
    cartaEvents,
    counts,
    lastAnalysis: documentAnalyses[0] || null,
  };
}

export async function refreshStudentDetailData(
  studentId: string
): Promise<StudentDisciplinarySnapshot> {
  return fetchStudentDisciplinarySnapshot(studentId);
}

export async function fetchCartaAnnotations(carta: CartaDisciplinaria): Promise<Annotation[]> {
  const { data, error } = await supabase
    .from('inspectorate_records')
    .select(
      'id,student_id,date_time,observation,severity,type,registered_by,created_at,created_by,pdf_file_path'
    )
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
