/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { ChecklistItem } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { CHECKLIST_CONFLICT_TARGET } from './checklistConflict';
import { normalizeDocumentPath } from './storage.service';

function itemsAreEqual(left: ChecklistItem, right: ChecklistItem): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function saveChecklist(
  causaId: string,
  items: ChecklistItem[],
  previousItems: ChecklistItem[] = [],
): Promise<boolean> {
  const tenantId = useAuthStore.getState().tenantId;
  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const rows = items
    .filter((item) => {
      const previous = previousById.get(item.id);
      return !previous || !itemsAreEqual(item, previous);
    })
    .map((item) => ({
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

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from('checklist_items')
      .upsert(rows, { onConflict: CHECKLIST_CONFLICT_TARGET });

    if (upsertError) {
      console.error('Error upserting checklist items:', upsertError.message || upsertError);
      return false;
    }
  }

  const activeIds = new Set(items.map((item) => item.id));
  const removedIds = previousItems.filter((item) => !activeIds.has(item.id)).map((item) => item.id);

  if (removedIds.length === 0) return true;

  const { error: cleanupError } = await supabase
    .from('checklist_items')
    .delete()
    .eq('causa_id', causaId)
    .in('id', removedIds);

  if (cleanupError) {
    console.error('Error cleaning obsolete checklist items:', cleanupError);
    return false;
  }

  return true;
}
