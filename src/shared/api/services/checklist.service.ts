/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { ChecklistItem } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';

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

  const tenantId = useAuthStore.getState().tenantId;
  const { error: insertError } = await supabase.from('checklist_items').insert(
    items.map((c) => ({
      id: c.id,
      causa_id: causaId,
      tenant_id: tenantId,
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
