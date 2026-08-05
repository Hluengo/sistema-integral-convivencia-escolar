/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { BitacoraEntry } from '../../lib/types';
import { normalizeDocumentPath } from './storage.service';

function entriesAreEqual(left: BitacoraEntry, right: BitacoraEntry): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

interface BitacoraSnapshotRow {
  id: string;
  fecha: string;
  tipo: BitacoraEntry['tipo'];
  titulo: string;
  descripcion: string;
  participantes: string[];
  documento_adjunto: string | null;
}

export function buildBitacoraSnapshotDelta(
  entries: BitacoraEntry[],
  previousEntries: BitacoraEntry[] = [],
): { rows: BitacoraSnapshotRow[]; removedIds: string[] } {
  const previousById = new Map(previousEntries.map((entry) => [entry.id, entry]));
  const rows = entries
    .filter((entry) => {
      const previous = previousById.get(entry.id);
      return !previous || !entriesAreEqual(entry, previous);
    })
    .map((entry) => ({
      id: entry.id,
      fecha: entry.fecha,
      tipo: entry.tipo,
      titulo: entry.titulo,
      descripcion: entry.descripcion,
      participantes: entry.participantes || [],
      documento_adjunto: entry.documentoAdjunto
        ? normalizeDocumentPath(entry.documentoAdjunto)
        : null,
    }));

  const activeIds = new Set(entries.map((entry) => entry.id));
  const removedIds = previousEntries
    .filter((entry) => !activeIds.has(entry.id))
    .map((entry) => entry.id);

  return { rows, removedIds };
}

export async function saveBitacora(
  causaId: string,
  entries: BitacoraEntry[],
  previousEntries: BitacoraEntry[] = [],
): Promise<boolean> {
  const { rows, removedIds } = buildBitacoraSnapshotDelta(entries, previousEntries);

  if (rows.length === 0 && removedIds.length === 0) return true;

  const { error } = await supabase.rpc('save_bitacora_snapshot', {
    p_causa_id: causaId,
    p_entries: rows,
    p_removed_entry_ids: removedIds,
  });

  if (error) {
    console.error('Error saving bitacora snapshot:', error.message || error);
    return false;
  }
  return true;
}
