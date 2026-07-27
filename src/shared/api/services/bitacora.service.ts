/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { BitacoraEntry } from '../../../types';
import { BitacoraEntrySchema } from '../../../schemas';
import { useAuthStore } from '../../../stores/authStore';
import { normalizeDocumentPath } from './storage.service';

interface SupabaseBitacoraRow {
  id: string;
  fecha: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  participantes: string[];
  documento_adjunto: string | null;
}

function mapBitacoraRow(row: SupabaseBitacoraRow): BitacoraEntry | null {
  const documentoAdjunto = row.documento_adjunto
    ? normalizeDocumentPath(row.documento_adjunto)
    : undefined;
  const parsed = BitacoraEntrySchema.safeParse({
    id: row.id,
    fecha: row.fecha,
    tipo: row.tipo,
    titulo: row.titulo,
    descripcion: row.descripcion,
    participantes: row.participantes || [],
    documentoAdjunto: documentoAdjunto || undefined,
  });
  if (!parsed.success) {
    console.error(`Invalid bitacora entry ${row.id}:`, parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export async function fetchBitacora(causaId: string): Promise<BitacoraEntry[]> {
  const { data, error } = await supabase
    .from('bitacora_entries')
    .select('id,fecha,tipo,titulo,descripcion,participantes,documento_adjunto')
    .eq('causa_id', causaId)
    .order('fecha', { ascending: false });

  if (error || !data) {
    console.error('Error fetching bitacora:', error);
    return [];
  }

  const entries = (data as SupabaseBitacoraRow[]).map(mapBitacoraRow);
  return entries.filter((entry): entry is BitacoraEntry => entry !== null);
}

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

export async function addBitacoraEntry(causaId: string, entry: BitacoraEntry): Promise<boolean> {
  const tenantId = useAuthStore.getState().tenantId;
  const { error } = await supabase.from('bitacora_entries').upsert({
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
  }, { onConflict: 'id' });

  if (error) {
    console.error('Error adding bitacora entry:', error);
    return false;
  }
  return true;
}
