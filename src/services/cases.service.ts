/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type { Causa, BitacoraEntry, ChecklistItem } from '../types';

interface SupabaseBitacoraRow {
  id: string;
  fecha: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  participantes: string[];
  documento_adjunto: string | null;
}

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

interface SupabaseCausaRow {
  id: string;
  estudiante_nombre: string;
  estudiante_curso: string;
  nna_protected_name: string;
  run_estudiante: string;
  fecha_apertura: string;
  estado_actual: string;
  tipo_infraccion: string;
  responsable: string;
  compromete_aula_segura: boolean;
  fecha_ultima_actualizacion: string;
  observaciones: string;
  conducta_rice_id: string | null;
  medidas_ejecutadas: string[];
  bitacora_entries: SupabaseBitacoraRow[];
  checklist_items: SupabaseChecklistRow[];
}

/**
 * Fetch all causas with related bitacora and checklist in a single query (join).
 * Falls back to N+1 if foreign keys aren't set up for joins.
 */
export async function fetchCausas(): Promise<Causa[]> {
  const { data: causasData, error: causasError } = await supabase
    .from('causas')
    .select('*, bitacora_entries(*), checklist_items(*)')
    .order('fecha_ultima_actualizacion', { ascending: false });

  if (causasError || !causasData) {
    console.error('Error fetching causas:', causasError);
    return [];
  }

  const causas: Causa[] = causasData.map((row: SupabaseCausaRow) => {
    const bitacora: BitacoraEntry[] = (row.bitacora_entries || []).map(
      (b: SupabaseBitacoraRow) => ({
        id: b.id,
        fecha: b.fecha,
        tipo: b.tipo as BitacoraEntry['tipo'],
        titulo: b.titulo,
        descripcion: b.descripcion,
        participantes: b.participantes || [],
        documentoAdjunto: b.documento_adjunto || undefined,
      })
    );

    const checklist: ChecklistItem[] = (row.checklist_items || []).map(
      (c: SupabaseChecklistRow) => ({
        id: c.id,
        label: c.label,
        descripcion: c.descripcion,
        completado: c.completado,
        fechaCompletado: c.fecha_completado || undefined,
        requeridoPor: c.requerido_por as ChecklistItem['requeridoPor'],
        registradoPor: c.registrado_por || undefined,
        observaciones: c.observaciones || undefined,
        documentoNombre: c.documento_nombre || undefined,
        documentoUrl: c.documento_url || undefined,
      })
    );

    return {
      id: row.id,
      estudianteNombre: row.estudiante_nombre,
      estudianteCurso: row.estudiante_curso,
      nnaProtectedName: row.nna_protected_name,
      runEstudiante: row.run_estudiante,
      fechaApertura: row.fecha_apertura,
      estadoActual: row.estado_actual as Causa['estadoActual'],
      tipoInfraccion: row.tipo_infraccion as Causa['tipoInfraccion'],
      responsable: row.responsable,
      comprometeAulaSegura: row.compromete_aula_segura,
      fechaUltimaActualizacion: row.fecha_ultima_actualizacion,
      observaciones: row.observaciones || '',
      conductaRiceId: row.conducta_rice_id || undefined,
      medidasEjecutadas: row.medidas_ejecutadas || [],
      bitacora,
      checklistDebidoProceso: checklist,
    };
  });

  return causas;
}

/**
 * Resolve a unique causa id. Returns the preferred id if it is free in the
 * database, otherwise computes the next sequential "DC-2026-NNN" id based on
 * the highest numeric suffix currently present.
 */
async function resolveUniqueCausaId(preferred: string): Promise<string> {
  const { data: existing, error: checkError } = await supabase
    .from('causas')
    .select('id')
    .eq('id', preferred)
    .maybeSingle();

  if (!checkError && !existing) {
    return preferred;
  }

  const { data: all } = await supabase.from('causas').select('id');

  const year = new Date().getFullYear();
  let max = 0;
  for (const row of all || []) {
    const match = new RegExp(`^DC-${year}-(\\d+)$`).exec(row.id);
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (n > max) {
        max = n;
      }
    }
  }

  const next = max + 1;
  const padding = next < 10 ? `00${next}` : next < 100 ? `0${next}` : `${next}`;
  return `DC-${year}-${padding}`;
}

/**
 * Create a new causa with its initial bitacora entry.
 * Returns the id actually used, or false on failure.
 */
export async function createCausa(causa: Causa): Promise<string | false> {
  const causaId = await resolveUniqueCausaId(causa.id);

  // 1. Insert the causa
  const { error: causaError } = await supabase.from('causas').insert({
    id: causaId,
    estudiante_nombre: causa.estudianteNombre,
    estudiante_curso: causa.estudianteCurso,
    nna_protected_name: causa.nnaProtectedName,
    run_estudiante: causa.runEstudiante,
    fecha_apertura: causa.fechaApertura,
    estado_actual: causa.estadoActual,
    tipo_infraccion: causa.tipoInfraccion,
    responsable: causa.responsable,
    compromete_aula_segura: causa.comprometeAulaSegura,
    fecha_ultima_actualizacion: causa.fechaUltimaActualizacion,
    observaciones: causa.observaciones,
    conducta_rice_id: causa.conductaRiceId || null,
    medidas_ejecutadas: causa.medidasEjecutadas || [],
  });

  if (causaError) {
    console.error('Error creating causa:', causaError);
    return false;
  }

  // 2. Insert initial bitacora entry if exists
  if (causa.bitacora && causa.bitacora.length > 0) {
    const { error: bitacoraError } = await supabase.from('bitacora_entries').insert(
      causa.bitacora.map((b) => ({
        id: b.id,
        causa_id: causaId,
        fecha: b.fecha,
        tipo: b.tipo,
        titulo: b.titulo,
        descripcion: b.descripcion,
        participantes: b.participantes || [],
        documento_adjunto: b.documentoAdjunto || null,
      }))
    );

    if (bitacoraError) {
      console.error('Error creating bitacora entries:', bitacoraError);
    }
  }

  // 3. Insert checklist items
  if (causa.checklistDebidoProceso && causa.checklistDebidoProceso.length > 0) {
    const { error: checklistError } = await supabase.from('checklist_items').insert(
      causa.checklistDebidoProceso.map((c) => ({
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

    if (checklistError) {
      console.error('Error creating checklist items:', checklistError);
    }
  }

  return causaId;
}

/**
 * Update an existing causa (main fields only)
 */
export async function updateCausa(causa: Causa): Promise<boolean> {
  const { error } = await supabase
    .from('causas')
    .update({
      estudiante_nombre: causa.estudianteNombre,
      estudiante_curso: causa.estudianteCurso,
      nna_protected_name: causa.nnaProtectedName,
      run_estudiante: causa.runEstudiante,
      fecha_apertura: causa.fechaApertura,
      estado_actual: causa.estadoActual,
      tipo_infraccion: causa.tipoInfraccion,
      responsable: causa.responsable,
      compromete_aula_segura: causa.comprometeAulaSegura,
      fecha_ultima_actualizacion: causa.fechaUltimaActualizacion,
      observaciones: causa.observaciones,
      conducta_rice_id: causa.conductaRiceId || null,
      medidas_ejecutadas: causa.medidasEjecutadas || [],
    })
    .eq('id', causa.id);

  if (error) {
    console.error('Error updating causa:', error);
    return false;
  }

  return true;
}

/**
 * Delete a causa and all related data (cascade should handle it, but explicit is safer)
 */
export async function deleteCausa(causaId: string): Promise<boolean> {
  // Delete related data first (in case cascade isn't set properly)
  await supabase.from('bitacora_entries').delete().eq('causa_id', causaId);
  await supabase.from('checklist_items').delete().eq('causa_id', causaId);

  // Delete the causa
  const { error } = await supabase.from('causas').delete().eq('id', causaId);

  if (error) {
    console.error('Error deleting causa:', error);
    return false;
  }

  return true;
}

/**
 * Save bitacora entries for a causa (replaces all existing)
 */
export async function saveBitacora(causaId: string, entries: BitacoraEntry[]): Promise<boolean> {
  // Delete existing entries
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

  // Insert new entries
  const { error: insertError } = await supabase.from('bitacora_entries').insert(
    entries.map((b) => ({
      id: b.id,
      causa_id: causaId,
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
 * Save checklist items for a causa (replaces all existing)
 */
export async function saveChecklist(causaId: string, items: ChecklistItem[]): Promise<boolean> {
  // Delete existing items
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

  // Insert new items
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
