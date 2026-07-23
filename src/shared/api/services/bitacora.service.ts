/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { BitacoraEntry } from '../../../types';
import { BitacoraEntrySchema } from '../../../schemas';
import { useAuthStore } from '../../../stores/authStore';

interface SupabaseBitacoraRow {
  id: string;
  fecha: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  participantes: string[];
  documento_adjunto: string | null;
}

function mapBitacoraRow(row: SupabaseBitacoraRow): BitacoraEntry {
  return BitacoraEntrySchema.parse({
    id: row.id,
    fecha: row.fecha,
    tipo: row.tipo,
    titulo: row.titulo,
    descripcion: row.descripcion,
    participantes: row.participantes || [],
    documentoAdjunto: row.documento_adjunto || undefined,
  });
}

/**
 * Fetch all bitacora entries for a causa.
 */
export async function fetchBitacora(causaId: string): Promise<BitacoraEntry[]> {
  const { data, error } = await supabase
    .from('bitacora_entries')
    .select('id,fecha,tipo,titulo,descripcion,participantes,documento_adjunto')
    .eq('causa_id', causaId)
    .order('fecha', { ascending: true });

  if (error || !data) {
    console.error('Error fetching bitacora:', error);
    return [];
  }

  return data.map(mapBitacoraRow);
}

/**
 * Save bitacora entries for a causa (replaces all existing).
 */
export async function saveBitacora(causaId: string, entries: BitacoraEntry[]): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from('bitacora_entries')
    .delete()
    .eq('causa_id', causaId);

  if (deleteError) {
    console.error('Error deleting old bitacora entries:', deleteError);
    return false;
  }

  if (entries.length === 0) {
    return true;
  }

  const tenantId = useAuthStore.getState().tenantId;
  const { error: insertError } = await supabase.from('bitacora_entries').insert(
    entries.map((b) => ({
      id: b.id,
      causa_id: causaId,
      tenant_id: tenantId,
      fecha: b.fecha,
      tipo: b.tipo,
      titulo: b.titulo,
      descripcion: b.descripcion,
      participantes: b.participantes || [],
      documento_adjunto: b.documentoAdjunto || null,
    }))
  );

  if (insertError) {
    console.error('Error inserting bitacora entries:', insertError?.message || insertError);
    return false;
  }

  return true;
}

/**
 * Add a single bitacora entry.
 */
export async function addBitacoraEntry(causaId: string, entry: BitacoraEntry): Promise<boolean> {
  const tenantId = useAuthStore.getState().tenantId;
  const { error } = await supabase.from('bitacora_entries').insert({
    id: entry.id,
    causa_id: causaId,
    tenant_id: tenantId,
    fecha: entry.fecha,
    tipo: entry.tipo,
    titulo: entry.titulo,
    descripcion: entry.descripcion,
    participantes: entry.participantes || [],
    documento_adjunto: entry.documentoAdjunto || null,
  });

  if (error) {
    console.error('Error adding bitacora entry:', error);
    return false;
  }

  return true;
}
