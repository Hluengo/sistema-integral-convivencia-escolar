/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { BitacoraEntry, Causa, ChecklistItem } from '../../../types';
import { BitacoraEntrySchema, CausaSchema, ChecklistItemSchema } from '../../../schemas';
import { getBaseChecklist } from '../../../data';
import { useAuthStore } from '../../../stores/authStore';
import { getDocumentSignedUrl } from './storage.service';

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

interface SupabaseBitacoraRow {
  id: string;
  causa_id: string;
  fecha: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  participantes: string[] | null;
  documento_adjunto: string | null;
}

async function mapChecklistRow(row: SupabaseChecklistRow): Promise<ChecklistItem | null> {
  const documentoUrl = row.documento_url
    ? await getDocumentSignedUrl(row.documento_url)
    : undefined;
  const parsed = ChecklistItemSchema.safeParse({
    id: row.id,
    label: row.label,
    descripcion: row.descripcion,
    completado: row.completado,
    fechaCompletado: row.fecha_completado || undefined,
    requeridoPor: row.requerido_por,
    registradoPor: row.registrado_por || undefined,
    observaciones: row.observaciones || undefined,
    documentoNombre: row.documento_nombre || undefined,
    documentoUrl: documentoUrl || undefined,
  });
  if (!parsed.success) {
    console.error(`Invalid checklist item ${row.id}:`, parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

async function mapBitacoraRow(row: SupabaseBitacoraRow): Promise<BitacoraEntry | null> {
  const documentoAdjunto = row.documento_adjunto
    ? await getDocumentSignedUrl(row.documento_adjunto)
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

const DEFAULT_PAGE_SIZE = 100;

export async function fetchCausas(limit = DEFAULT_PAGE_SIZE): Promise<Causa[]> {
  let causaQuery = supabase
    .from('causas')
    .select('id,estudiante_nombre,estudiante_curso,nna_protected_name,run_estudiante,fecha_apertura,estado_actual,tipo_infraccion,responsable,compromete_aula_segura,fecha_ultima_actualizacion,observaciones,conducta_rice_id,medidas_ejecutadas')
    .order('fecha_ultima_actualizacion', { ascending: false });

  if (limit > 0) causaQuery = causaQuery.limit(limit);
  const { data, error } = await causaQuery;
  if (error || !data) {
    console.error('Error fetching causas:', error);
    throw error || new Error('No se recibieron causas desde Supabase.');
  }

  const causas: Causa[] = [];
  for (const row of data as SupabaseCausaRow[]) {
    const parsed = CausaSchema.safeParse({
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
    });
    if (parsed.success) causas.push(parsed.data);
    else console.error(`Invalid causa ${row.id}:`, parsed.error.flatten());
  }

  const ids = causas.map((causa) => causa.id);
  if (ids.length === 0) return causas;

  const [checklistResult, bitacoraResult] = await Promise.all([
    supabase
      .from('checklist_items')
      .select('id,causa_id,label,descripcion,completado,fecha_completado,requerido_por,registrado_por,observaciones,documento_nombre,documento_url')
      .in('causa_id', ids),
    supabase
      .from('bitacora_entries')
      .select('id,causa_id,fecha,tipo,titulo,descripcion,participantes,documento_adjunto')
      .in('causa_id', ids)
      .order('fecha', { ascending: false }),
  ]);

  if (checklistResult.error) console.error('Error fetching checklist items:', checklistResult.error);
  if (bitacoraResult.error) console.error('Error fetching bitacora entries:', bitacoraResult.error);

  const checklistByCausa = new Map<string, ChecklistItem[]>();
  const checklistMapped = await Promise.all(
    ((checklistResult.data || []) as SupabaseChecklistRow[]).map(async (row) => ({
      causaId: row.causa_id,
      item: await mapChecklistRow(row),
    }))
  );
  for (const { causaId, item } of checklistMapped) {
    if (!item) continue;
    const current = checklistByCausa.get(causaId) || [];
    current.push(item);
    checklistByCausa.set(causaId, current);
  }

  const bitacoraByCausa = new Map<string, BitacoraEntry[]>();
  const bitacoraMapped = await Promise.all(
    ((bitacoraResult.data || []) as SupabaseBitacoraRow[]).map(async (row) => ({
      causaId: row.causa_id,
      entry: await mapBitacoraRow(row),
    }))
  );
  for (const { causaId, entry } of bitacoraMapped) {
    if (!entry) continue;
    const current = bitacoraByCausa.get(causaId) || [];
    current.push(entry);
    bitacoraByCausa.set(causaId, current);
  }

  return causas.map((causa) => ({
    ...causa,
    bitacora: bitacoraByCausa.get(causa.id) || [],
    checklistDebidoProceso: checklistByCausa.get(causa.id) || getBaseChecklist(),
  }));
}

async function resolveUniqueCausaId(preferred: string): Promise<string> {
  const { data: existing, error: checkError } = await supabase
    .from('causas').select('id').eq('id', preferred).maybeSingle();
  if (!checkError && !existing) return preferred;
  const { data: all } = await supabase.from('causas').select('id');
  const year = new Date().getFullYear();
  let max = 0;
  for (const row of all || []) {
    const match = new RegExp(`^DC-${year}-(\\d+)$`).exec(row.id);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `DC-${year}-${String(max + 1).padStart(3, '0')}`;
}

export async function createCausa(causa: Causa): Promise<string | false> {
  const causaId = await resolveUniqueCausaId(causa.id);
  const tenantId = useAuthStore.getState().tenantId;
  const { error } = await supabase.from('causas').insert({
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
  if (error) {
    console.error('Error creating causa:', error);
    return false;
  }
  return causaId;
}

export async function updateCausa(causa: Causa): Promise<boolean> {
  const { data, error } = await supabase
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
    .eq('id', causa.id)
    .select('id');
  if (error) {
    console.error('Error updating causa:', error);
    return false;
  }
  return Boolean(data?.length);
}

export async function deleteCausa(causaId: string): Promise<boolean> {
  await Promise.all([
    supabase.from('bitacora_entries').delete().eq('causa_id', causaId),
    supabase.from('checklist_items').delete().eq('causa_id', causaId),
  ]);
  const { error } = await supabase.from('causas').delete().eq('id', causaId);
  if (error) {
    console.error('Error deleting causa:', error);
    return false;
  }
  return true;
}
