/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { BitacoraEntry, Causa, ChecklistItem } from '../../lib/types';
import { BitacoraEntrySchema, CausaSchema, ChecklistItemSchema } from '../../lib/schemas';
import { normalizeDocumentPath } from './storage.service';
import { reconcileChecklistFromBitacora } from '../../lib/domain/checklistReconciliation';

interface SupabaseCausaRow {
  id: string;
  student_id: string | null;
  incidente_id: string | null;
  estudiante_nombre: string;
  estudiante_curso: string;
  nna_protected_name: string;
  run_estudiante: string;
  fecha_apertura: string;
  estado_actual: string;
  tipo_infraccion: string;
  responsable: string;
  compromete_aula_segura: boolean | null;
  fecha_ultima_actualizacion: string;
  observaciones: string | null;
  conducta_rice_id: string | null;
  medidas_ejecutadas: string[] | null;
  plazo_24h: boolean | null;
  fecha_limite_24h: string | null;
  fecha_inicio_investigacion: string | null;
  plazo_investigacion_dias: number | null;
  fecha_limite_investigacion: string | null;
  fecha_limite_cierre: string | null;
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
  compartido_grupal: boolean;
}

function mapChecklistRow(row: SupabaseChecklistRow): ChecklistItem | null {
  const documentoUrl = row.documento_url ? normalizeDocumentPath(row.documento_url) : undefined;
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
    compartidoGrupal: row.compartido_grupal,
  });
  if (!parsed.success) {
    console.error(`Invalid bitacora entry ${row.id}:`, parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

const DEFAULT_PAGE_SIZE = 100;

export interface CausasPage {
  causas: Causa[];
  nextOffset?: number;
}

function mapCausaRows(rows: SupabaseCausaRow[]): Causa[] {
  const causas: Causa[] = [];
  for (const row of rows) {
    const parsed = CausaSchema.safeParse({
      id: row.id,
      studentId: row.student_id || undefined,
      incidenteId: row.incidente_id || undefined,
      estudianteNombre: row.estudiante_nombre,
      estudianteCurso: row.estudiante_curso,
      nnaProtectedName: row.nna_protected_name,
      runEstudiante: row.run_estudiante,
      fechaApertura: row.fecha_apertura,
      estadoActual: row.estado_actual,
      tipoInfraccion: row.tipo_infraccion,
      responsable: row.responsable,
      comprometeAulaSegura: row.compromete_aula_segura ?? false,
      fechaUltimaActualizacion: row.fecha_ultima_actualizacion,
      observaciones: row.observaciones || '',
      conductaRiceId: row.conducta_rice_id || undefined,
      medidasEjecutadas: row.medidas_ejecutadas || [],
      plazo24h: row.plazo_24h ?? false,
      fechaLimite24h: row.fecha_limite_24h || undefined,
      fechaInicioInvestigacion: row.fecha_inicio_investigacion || undefined,
      plazoInvestigacionDias: row.plazo_investigacion_dias || undefined,
      fechaLimiteInvestigacion: row.fecha_limite_investigacion || undefined,
      fechaLimiteCierre: row.fecha_limite_cierre || undefined,
      bitacora: [],
      checklistDebidoProceso: [],
    });
    if (parsed.success) causas.push(parsed.data);
    else console.error(`Invalid causa ${row.id}:`, parsed.error.flatten());
  }
  return causas;
}

/** Carga páginas pequeñas y ordenadas para evitar transferir expedientes no solicitados. */
export async function fetchCausasPage(offset = 0, pageSize = 50): Promise<CausasPage> {
  const requestedSize = Math.min(Math.max(pageSize, 1), DEFAULT_PAGE_SIZE);
  const { data, error } = await supabase
    .from('causas')
    .select(
      'id,student_id,incidente_id,estudiante_nombre,estudiante_curso,nna_protected_name,run_estudiante,fecha_apertura,estado_actual,tipo_infraccion,responsable,compromete_aula_segura,fecha_ultima_actualizacion,observaciones,conducta_rice_id,medidas_ejecutadas,plazo_24h,fecha_limite_24h,fecha_inicio_investigacion,plazo_investigacion_dias,fecha_limite_investigacion,fecha_limite_cierre',
    )
    .order('fecha_ultima_actualizacion', { ascending: false })
    .range(offset, offset + requestedSize);

  if (error || !data) {
    console.error('Error fetching causas page:', error);
    throw error || new Error('No se recibieron causas desde Supabase.');
  }

  const rows = data as SupabaseCausaRow[];
  const hasNextPage = rows.length > requestedSize;
  return {
    causas: mapCausaRows(rows.slice(0, requestedSize) as unknown as SupabaseCausaRow[]),
    nextOffset: hasNextPage ? offset + requestedSize : undefined,
  };
}

/**
 * Carga los antecedentes de un único expediente al abrirlo, incluyendo los
 * metadatos de la causa. Permite abrir un expediente por su id aunque aún no
 * figure en la lista cargada (por ejemplo, un deep-link a una causa que quedó
 * más allá de la primera página del listado).
 *
 * El listado solo necesita los metadatos de la causa. Mantener bitácora y
 * checklist fuera de esa consulta evita transferir antecedentes sensibles de
 * expedientes que la persona usuaria no ha solicitado revisar.
 */
export async function fetchCausaDetails(causaId: string): Promise<Causa> {
  const [causaResult, checklistResult, bitacoraResult] = await Promise.all([
    supabase
      .from('causas')
      .select(
        'id,student_id,incidente_id,estudiante_nombre,estudiante_curso,nna_protected_name,run_estudiante,fecha_apertura,estado_actual,tipo_infraccion,responsable,compromete_aula_segura,fecha_ultima_actualizacion,observaciones,conducta_rice_id,medidas_ejecutadas,plazo_24h,fecha_limite_24h,fecha_inicio_investigacion,plazo_investigacion_dias,fecha_limite_investigacion,fecha_limite_cierre',
      )
      .eq('id', causaId)
      .maybeSingle(),
    supabase
      .from('checklist_items')
      .select(
        'id,causa_id,label,descripcion,completado,fecha_completado,requerido_por,registrado_por,observaciones,documento_nombre,documento_url',
      )
      .eq('causa_id', causaId),
    supabase
      .from('bitacora_entries')
      .select('id,causa_id,fecha,tipo,titulo,descripcion,participantes,documento_adjunto,compartido_grupal')
      .eq('causa_id', causaId)
      .order('fecha', { ascending: false }),
  ]);

  if (causaResult.error) {
    console.error('Error fetching causa details:', causaResult.error);
    throw causaResult.error;
  }
  if (checklistResult.error)
    console.error('Error fetching checklist items:', checklistResult.error);
  if (bitacoraResult.error) console.error('Error fetching bitacora entries:', bitacoraResult.error);

  const [base] = mapCausaRows(
    (causaResult.data ? [causaResult.data] : []) as unknown as SupabaseCausaRow[],
  );
  if (!base) {
    throw new Error('No se encontró el expediente solicitado.');
  }

  const checklist = ((checklistResult.data || []) as SupabaseChecklistRow[])
    .map(mapChecklistRow)
    .filter((item): item is ChecklistItem => item !== null);
  const bitacora = ((bitacoraResult.data || []) as SupabaseBitacoraRow[])
    .map(mapBitacoraRow)
    .filter((entry): entry is BitacoraEntry => entry !== null);

  return {
    ...base,
    bitacora,
    checklistDebidoProceso: reconcileChecklistFromBitacora(checklist, bitacora),
  };
}

async function resolveUniqueCausaId(preferred: string): Promise<string> {
  const { data: existing, error: checkError } = await supabase
    .from('causas')
    .select('id')
    .eq('id', preferred)
    .maybeSingle();
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

export async function createCausa(causa: Causa, tenantId: string | null): Promise<string | false> {
  if (!tenantId) return false;
  const causaId = await resolveUniqueCausaId(causa.id);
  const { error } = await supabase.from('causas').insert({
    id: causaId,
    tenant_id: tenantId,
    student_id: causa.studentId || null,
    incidente_id: causa.incidenteId || null,
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
    plazo_24h: causa.plazo24h ?? false,
    fecha_limite_24h: causa.fechaLimite24h || null,
    fecha_inicio_investigacion: causa.fechaInicioInvestigacion || null,
    plazo_investigacion_dias: causa.plazoInvestigacionDias || null,
    fecha_limite_investigacion: causa.fechaLimiteInvestigacion || null,
    fecha_limite_cierre: causa.fechaLimiteCierre || null,
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
      ...(causa.studentId ? { student_id: causa.studentId } : {}),
      incidente_id: causa.incidenteId || null,
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
      plazo_24h: causa.plazo24h ?? false,
      fecha_limite_24h: causa.fechaLimite24h || null,
      fecha_inicio_investigacion: causa.fechaInicioInvestigacion || null,
      plazo_investigacion_dias: causa.plazoInvestigacionDias || null,
      fecha_limite_investigacion: causa.fechaLimiteInvestigacion || null,
      fecha_limite_cierre: causa.fechaLimiteCierre || null,
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
  const relatedDeletes = await Promise.all([
    supabase.from('bitacora_entries').delete().eq('causa_id', causaId),
    supabase.from('checklist_items').delete().eq('causa_id', causaId),
    supabase.from('causa_documents').delete().eq('causa_id', causaId),
  ]);
  const relatedError = relatedDeletes.find((result) => result.error)?.error;
  if (relatedError) {
    console.error('Error deleting related causa records:', relatedError);
    return false;
  }

  const { data: deletedCausas, error } = await supabase
    .from('causas')
    .delete()
    .eq('id', causaId)
    .select('id');
  if (error) {
    console.error('Error deleting causa:', error);
    return false;
  }
  if (!deletedCausas || deletedCausas.length !== 1) {
    console.error('Causa deletion affected no rows:', causaId);
    return false;
  }
  return true;
}
