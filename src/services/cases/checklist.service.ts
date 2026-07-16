/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../../lib/supabase';
import type { ChecklistItem } from '../../types';
import { ChecklistItemSchema } from '../../schemas';

interface SupabaseChecklistRow {
  id: string;
  label: string;
  descripcion: string;
  completado: boolean;
  fecha_completado: string | null;
  requerido_por: string;
  registrado_por: string | null;
  observaciones: string | null;
  documento_nombre: string | null;
  documento_url: string | null;
}

function mapChecklistRow(row: SupabaseChecklistRow): ChecklistItem {
  return ChecklistItemSchema.parse({
    id: row.id,
    label: row.label,
    descripcion: row.descripcion,
    completado: row.completado,
    fechaCompletado: row.fecha_completado || undefined,
    requeridoPor: row.requerido_por,
    registradoPor: row.registrado_por || undefined,
    observaciones: row.observaciones || undefined,
    documentoNombre: row.documento_nombre || undefined,
    documentoUrl: row.documento_url || undefined,
  });
}

/**
 * Fetch all checklist items for a causa.
 */
export async function fetchChecklist(causaId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('causa_id', causaId)
    .order('label', { ascending: true });

  if (error || !data) {
    console.error('Error fetching checklist:', error);
    return [];
  }

  return data.map(mapChecklistRow);
}

/**
 * Save checklist items for a causa (replaces all existing).
 */
export async function saveChecklist(causaId: string, items: ChecklistItem[]): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from('checklist_items')
    .delete()
    .eq('causa_id', causaId);

  if (deleteError) {
    console.error('Error deleting old checklist items:', deleteError);
    return false;
  }

  if (items.length === 0) {
    return true;
  }

  const { error: insertError } = await supabase.from('checklist_items').insert(
    items.map((c) => ({
      id: c.id,
      causa_id: causaId,
      label: c.label,
      descripcion: c.descripcion,
      completado: c.completado,
      fecha_completado: c.fechaCompletado || null,
      requerido_por: c.requeridoPor,
      registrado_por: c.registradoPor || null,
      observaciones: c.observaciones || null,
      documento_nombre: c.documentoNombre || null,
      documento_url: c.documentoUrl || null,
    }))
  );

  if (insertError) {
    console.error('Error inserting checklist items:', insertError?.message || insertError);
    return false;
  }

  return true;
}

/**
 * Add a single checklist item.
 */
export async function addChecklistItem(causaId: string, item: ChecklistItem): Promise<boolean> {
  const { error } = await supabase.from('checklist_items').insert({
    id: item.id,
    causa_id: causaId,
    label: item.label,
    descripcion: item.descripcion,
    completado: item.completado,
    fecha_completado: item.fechaCompletado || null,
    requerido_por: item.requeridoPor,
    registrado_por: item.registradoPor || null,
    observaciones: item.observaciones || null,
    documento_nombre: item.documentoNombre || null,
    documento_url: item.documentoUrl || null,
  });

  if (error) {
    console.error('Error adding checklist item:', error);
    return false;
  }

  return true;
}

/**
 * Update a single checklist item.
 */
export async function updateChecklistItem(item: ChecklistItem): Promise<boolean> {
  const { error } = await supabase
    .from('checklist_items')
    .update({
      label: item.label,
      descripcion: item.descripcion,
      completado: item.completado,
      fecha_completado: item.fechaCompletado || null,
      requerido_por: item.requeridoPor,
      registrado_por: item.registradoPor || null,
      observaciones: item.observaciones || null,
      documento_nombre: item.documentoNombre || null,
      documento_url: item.documentoUrl || null,
    })
    .eq('id', item.id);

  if (error) {
    console.error('Error updating checklist item:', error);
    return false;
  }

  return true;
}

/**
 * Delete a single checklist item.
 */
export async function deleteChecklistItem(itemId: string): Promise<boolean> {
  const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);

  if (error) {
    console.error('Error deleting checklist item:', error);
    return false;
  }

  return true;
}