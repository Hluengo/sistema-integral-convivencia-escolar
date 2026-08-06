/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { BitacoraEntry, Causa, ChecklistItem } from '../../lib/types';
import type {
  CausaDocumentSnapshot,
  CausaDocumentStatus,
} from '../../../features/causas/notificacionDocgen/types';
import {
  buildBitacoraEntryPayload,
  buildChecklistItemPayload,
} from '../../../features/causas/notificacionDocgen/builders';

export { buildBitacoraEntryPayload, buildChecklistItemPayload };

export interface CausaDocumentRow {
  id: string;
  causa_id: string;
  doc_type: string;
  status: CausaDocumentStatus;
  content_snapshot: Record<string, unknown> | null;
  created_by: string | null;
  emitted_by: string | null;
  student_name: string | null;
  apoderado_name: string | null;
  course: string | null;
  emission_date: string | null;
  notified_at: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

/** Crea la notificación en estado Pendiente (borrador persistido). */
export async function createPendingCausaDocument(
  causa: Causa,
  snapshot: CausaDocumentSnapshot,
): Promise<CausaDocumentRow | null> {
  const { data, error } = await supabase
    .from('causa_documents')
    .insert({
      causa_id: causa.id,
      doc_type: snapshot.docType,
      content_snapshot: snapshot as unknown as Record<string, unknown>,
      created_by: snapshot.emittedBy,
      emitted_by: snapshot.emittedBy,
      student_name: snapshot.studentName,
      apoderado_name: snapshot.apoderadoName,
      course: snapshot.expediente.course || '',
      emission_date: snapshot.emissionDate,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating causa document:', error.message || error);
    return null;
  }
  return data as CausaDocumentRow;
}

/** Lista los documentos de una causa (más reciente primero). */
export async function fetchCausaDocuments(causaId: string): Promise<CausaDocumentRow[]> {
  const { data, error } = await supabase
    .from('causa_documents')
    .select('*')
    .eq('causa_id', causaId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching causa documents:', error.message || error);
    return [];
  }
  return (data ?? []) as CausaDocumentRow[];
}

/** Guarda el snapshot del borrador (solo mientras esté Pendiente). */
export async function saveCausaDocumentSnapshot(
  documentId: string,
  snapshot: CausaDocumentSnapshot,
): Promise<boolean> {
  const { error } = await supabase
    .from('causa_documents')
    .update({
      content_snapshot: snapshot as unknown as Record<string, unknown>,
      emitted_by: snapshot.emittedBy,
    })
    .eq('id', documentId)
    .eq('status', 'Pendiente');

  if (error) {
    console.error('Error saving causa document snapshot:', error.message || error);
    return false;
  }
  return true;
}

/**
 * Marca la notificación como notificada de forma atómica: actualiza el
 * documento, completa chk_rec_3 y registra la entrada de bitácora en una
 * sola transacción con tenant resuelto en PostgreSQL.
 */
export async function markCausaDocumentNotified(
  documentId: string,
  snapshot: CausaDocumentSnapshot,
  checklistItem: ChecklistItem,
  bitacoraEntry: BitacoraEntry,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc('mark_causa_document_notified', {
    p_document_id: documentId,
    p_snapshot: snapshot as unknown as Record<string, unknown>,
    p_checklist_item: buildChecklistItemPayload(checklistItem),
    p_bitacora_entry: buildBitacoraEntryPayload(bitacoraEntry),
  });

  if (error) {
    console.error('Error marking causa document notified:', error.message || error);
    return { ok: false, error: error.message || 'No se pudo marcar como notificada.' };
  }
  return { ok: true, error: null };
}

/** Anula la notificación (solo mientras esté Pendiente). */
export async function annulCausaDocument(documentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('causa_documents')
    .update({ status: 'Anulada' })
    .eq('id', documentId)
    .eq('status', 'Pendiente');

  if (error) {
    console.error('Error annulling causa document:', error.message || error);
    return false;
  }
  return true;
}
