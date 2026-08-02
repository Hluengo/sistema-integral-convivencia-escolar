/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { BitacoraEntry } from '../../lib/types';
import { useAuthStore } from '../../lib/stores/authStore';
import { normalizeDocumentPath } from './storage.service';

function entriesAreEqual(left: BitacoraEntry, right: BitacoraEntry): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function saveBitacora(
  causaId: string,
  entries: BitacoraEntry[],
  previousEntries: BitacoraEntry[] = [],
): Promise<boolean> {
  const tenantId = useAuthStore.getState().tenantId;
  const previousById = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const rows = entries
    .filter((entry) => {
      const previous = previousById.get(entry.id);
      return !previous || !entriesAreEqual(entry, previous);
    })
    .map((entry) => ({
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

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from('bitacora_entries')
      .upsert(rows, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error upserting bitacora entries:', upsertError.message || upsertError);
      return false;
    }
  }

  const activeIds = new Set(entries.map((entry) => entry.id));
  const removedIds = previousEntries
    .filter((entry) => !activeIds.has(entry.id))
    .map((entry) => entry.id);

  if (removedIds.length === 0) return true;

  const { error: cleanupError } = await supabase
    .from('bitacora_entries')
    .delete()
    .eq('causa_id', causaId)
    .in('id', removedIds);

  if (cleanupError) {
    console.error('Error cleaning obsolete bitacora entries:', cleanupError);
    return false;
  }
  return true;
}
