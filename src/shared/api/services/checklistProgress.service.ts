/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { ChecklistProgressEntry, BitacoraEntry } from '../../lib/types';
import { ChecklistProgressEntrySchema } from '../../lib/schemas';
import { normalizeDocumentPath, uploadDocument } from './storage.service';

interface ProgressRow {
  id: string;
  causa_id: string;
  checklist_item_id: string;
  title: string;
  description: string;
  entry_type: BitacoraEntry['tipo'];
  occurred_at: string;
  document_name: string | null;
  document_url: string | null;
  created_by: string | null;
  created_at: string;
  invalidated_at: string | null;
  invalidated_by: string | null;
  invalidation_reason: string | null;
}

const PROGRESS_COLUMNS =
  'id,causa_id,checklist_item_id,title,description,entry_type,occurred_at,document_name,document_url,created_by,created_at,invalidated_at,invalidated_by,invalidation_reason';

function mapRow(row: ProgressRow): ChecklistProgressEntry | null {
  const parsed = ChecklistProgressEntrySchema.safeParse({
    id: row.id,
    causaId: row.causa_id,
    checklistItemId: row.checklist_item_id,
    title: row.title,
    description: row.description,
    entryType: row.entry_type,
    occurredAt: row.occurred_at,
    documentName: row.document_name || undefined,
    documentUrl: row.document_url
      ? normalizeDocumentPath(row.document_url) || undefined
      : undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    invalidatedAt: row.invalidated_at || undefined,
    invalidatedBy: row.invalidated_by || undefined,
    invalidationReason: row.invalidation_reason || undefined,
  });
  if (!parsed.success) {
    console.error(`Invalid checklist progress entry ${row.id}:`, parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export interface CreateChecklistProgressInput {
  causaId: string;
  checklistItemId: string;
  title: string;
  description: string;
  entryType: BitacoraEntry['tipo'];
  occurredAt: string;
  documentFile?: File | null;
}

export async function fetchChecklistProgress(causaId: string): Promise<ChecklistProgressEntry[]> {
  const { data, error } = await supabase
    .from('checklist_progress_entries')
    .select(PROGRESS_COLUMNS)
    .eq('causa_id', causaId)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as ProgressRow[])
    .map(mapRow)
    .filter((entry): entry is ChecklistProgressEntry => entry !== null);
}

export async function createChecklistProgress(
  input: CreateChecklistProgressInput,
): Promise<ChecklistProgressEntry> {
  const documentUrl = input.documentFile
    ? await uploadDocument(input.causaId, input.documentFile, 'avances')
    : undefined;
  const { data, error } = await supabase
    .from('checklist_progress_entries')
    .insert({
      causa_id: input.causaId,
      checklist_item_id: input.checklistItemId,
      title: input.title.trim(),
      description: input.description.trim(),
      entry_type: input.entryType,
      occurred_at: input.occurredAt,
      document_name: input.documentFile?.name || null,
      document_url: documentUrl || null,
    })
    .select(PROGRESS_COLUMNS)
    .single();
  if (error || !data) throw error || new Error('No fue posible guardar el avance.');
  const mapped = mapRow(data as ProgressRow);
  if (!mapped) throw new Error('El avance guardado no tiene un formato válido.');
  return mapped;
}

export async function invalidateChecklistProgress(id: string, reason: string): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError || new Error('La sesión ya no está disponible.');
  const { error } = await supabase
    .from('checklist_progress_entries')
    .update({
      invalidated_at: new Date().toISOString(),
      invalidated_by: authData.user.id,
      invalidation_reason: reason.trim(),
    })
    .eq('id', id)
    .is('invalidated_at', null);
  if (error) throw error;
}
