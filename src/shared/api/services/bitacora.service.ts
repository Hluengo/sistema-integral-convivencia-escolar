/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { BitacoraEntry } from '../../../types';
import { useAuthStore } from '../../../stores/authStore';
import { normalizeDocumentPath } from './storage.service';

export async function saveBitacora(causaId: string, entries: BitacoraEntry[]): Promise<boolean> {
  const tenantId = useAuthStore.getState().tenantId;

  if (entries.length === 0) {
    const { error } = await supabase.from('bitacora_entries').delete().eq('causa_id', causaId);
    if (error) console.error('Error clearing bitacora entries:', error);
    return !error;
  }

  const rows = entries.map((entry) => ({
    id: entry.id,
    causa_id: causaId,
    tenant_id: tenantId,
    fecha: entry.fecha,
    tipo: entry.tipo,
    titulo: entry.titulo,
    descripcion: entry.descripcion,
    participantes: entry.participantes || [],
    documento_adjunto: entry.documentoAdjunto
      ? normalizeDocumentPath(entry.documentoAdjunto)
      : null,
  }));

  const { error: upsertError } = await supabase
    .from('bitacora_entries')
    .upsert(rows, { onConflict: 'id' });

  if (upsertError) {
    console.error('Error upserting bitacora entries:', upsertError.message || upsertError);
    return false;
  }

  const activeIds = entries.map((entry) => entry.id);
  const { error: cleanupError } = await supabase
    .from('bitacora_entries')
    .delete()
    .eq('causa_id', causaId)
    .not('id', 'in', `(${activeIds.map((id) => `"${id.replace(/"/g, '')}"`).join(',')})`);

  if (cleanupError) {
    console.error('Error cleaning obsolete bitacora entries:', cleanupError);
    return false;
  }
  return true;
}
