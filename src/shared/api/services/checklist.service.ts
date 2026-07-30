/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { ChecklistItem } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { CHECKLIST_CONFLICT_TARGET } from './checklistConflict';
import { normalizeDocumentPath } from './storage.service';

export async function saveChecklist(causaId: string, items: ChecklistItem[]): Promise<boolean> {
  const tenantId = useAuthStore.getState().tenantId;

  if (items.length === 0) {
    const { error } = await supabase.from('checklist_items').delete().eq('causa_id', causaId);
    if (error) console.error('Error clearing checklist items:', error);
    return !error;
  }

  const rows = items.map((item) => ({
    id: item.id,
    causa_id: causaId,
    tenant_id: tenantId,
    label: item.label,
    descripcion: item.descripcion,
    completado: item.completado,
    fecha_completado: item.fechaCompletado || null,
    requerido_por: item.requeridoPor,
    registrado_por: item.registradoPor || null,
    observaciones: item.observaciones || null,
    documento_nombre: item.documentoNombre || null,
    documento_url: item.documentoUrl ? normalizeDocumentPath(item.documentoUrl) : null,
  }));

  const { error: upsertError } = await supabase
    .from('checklist_items')
    .upsert(rows, { onConflict: CHECKLIST_CONFLICT_TARGET });

  if (upsertError) {
    console.error('Error upserting checklist items:', upsertError.message || upsertError);
    return false;
  }

  const activeIds = items.map((item) => item.id);
  const { error: cleanupError } = await supabase
    .from('checklist_items')
    .delete()
    .eq('causa_id', causaId)
    .not('id', 'in', `(${activeIds.map((id) => `"${id.replace(/"/g, '')}"`).join(',')})`);

  if (cleanupError) {
    console.error('Error cleaning obsolete checklist items:', cleanupError);
    return false;
  }

  return true;
}
