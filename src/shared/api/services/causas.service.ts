/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { Causa, ChecklistItem } from '../../../types';
import { CausaSchema, ChecklistItemSchema } from '../../../schemas';
import { getBaseChecklist } from '../../../data';
import { useAuthStore } from '../../../stores/authStore';

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
}

interface SupabaseChecklistRow {
  id: string;
  causa_id: string;
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

const DEFAULT_PAGE_SIZE = 100;

/**
 * Fetch causas ordered by last update (most recent first),
 * including their checklist items from the checklist_items table.
 * Causas without stored checklist items get the default checklist.
 * @param limit - max records to return (default 100, 0 = no limit)
 */
export async function fetchCausas(limit = DEFAULT_PAGE_SIZE): Promise<Causa[]> {
  let query = supabase
    .from('causas')
    .select('*')
    .order('fecha_ultima_actualizacion', { ascending: false });

  if (limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching causas:', error);
    return [];
  }

  const causas = data.map((row: SupabaseCausaRow) =>
    CausaSchema.parse({
      id: row.id,
      estudianteNombre: row.estudiante_nombre,
      estudianteCurso: row.estudiante_curso,
      nnaProtectedName: row.nna_protected_name,
      runEstudiante: row.run_estudiante,
      fechaApertura: row.fecha_apertura,
      estadoActual: row.estado_actual,
      tipoInfraccion: row.tipo_infraccion,
      responsable: row.responsable,
      comprometeAulaSegura: row.compromete_aula_segura,
      fechaUltimaActualizacion: row.fecha_ultima_actualizacion,
      observaciones: row.observaciones || '',
      conductaRiceId: row.conducta_rice_id || undefined,
      medidasEjecutadas: row.medidas_ejecutadas || [],
      bitacora: [],
      checklistDebidoProceso: [],
    })
  );

  const ids = causas.map((c) => c.id);
  if (ids.length === 0) return causas;

  const { data: checklistRows, error: checklistError } = await supabase
    .from('checklist_items')
    .select('*')
    .in('causa_id', ids);

  if (checklistError) {
    console.error('Error fetching checklist items:', checklistError);
  }

  const checklistByCausa = new Map<string, ChecklistItem[]>();
  if (checklistRows) {
    for (const row of checklistRows as SupabaseChecklistRow[]) {
      const list = checklistByCausa.get(row.causa_id);
      if (list) {
        list.push(mapChecklistRow(row));
      } else {
        checklistByCausa.set(row.causa_id, [mapChecklistRow(row)]);
      }
    }
  }

  return causas.map((causa) => ({
    ...causa,
    checklistDebidoProceso: checklistByCausa.get(causa.id) || getBaseChecklist(),
  }));
}

/**
 * Resolve a unique causa id. Returns the preferred id if free,
 * otherwise computes the next sequential "DC-2026-NNN" id.
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
 * Create a new causa with its initial bitacora and checklist.
 * Returns the id actually used, or false on failure.
 */
export async function createCausa(causa: Causa): Promise<string | false> {
  const causaId = await resolveUniqueCausaId(causa.id);
  const tenantId = useAuthStore.getState().tenantId;

  const { error: causaError } = await supabase.from('causas').insert({
    id: causaId,
    tenant_id: tenantId,
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

  return causaId;
}

/**
 * Update an existing causa (main fields only).
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
 * Delete a causa and all related data (bitacora, checklist).
 */
export async function deleteCausa(causaId: string): Promise<boolean> {
  await supabase.from('bitacora_entries').delete().eq('causa_id', causaId);
  await supabase.from('checklist_items').delete().eq('causa_id', causaId);

  const { error } = await supabase.from('causas').delete().eq('id', causaId);

  if (error) {
    console.error('Error deleting causa:', error);
    return false;
  }

  return true;
}
