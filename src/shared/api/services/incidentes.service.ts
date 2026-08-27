/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { Causa, Incidente } from '../../lib/types';
import { normalizeDocumentPath } from './storage.service';

const INCIDENTE_COLUMNS =
  'id,tenant_id,fecha_hora,lugar,tipo,descripcion,responsable,created_at,updated_at';

export interface CreateIncidenteInput {
  fechaHora?: string;
  lugar: string;
  tipo?: string;
  descripcion: string;
  responsable: string;
}

export interface IncidenteCausaSummary {
  id: string;
  estudianteNombre: string;
  nnaProtectedName: string;
  estudianteCurso: string;
  estadoActual: Causa['estadoActual'];
  tipoInfraccion: Causa['tipoInfraccion'];
  fechaUltimaActualizacion: string;
}

export interface IncidenteSharedActivity {
  id: string;
  kind: 'avance' | 'hito';
  sourceCausaId: string;
  title: string;
  description: string;
  entryType: string;
  occurredAt: string;
  documentName?: string;
  documentUrl?: string;
}

function mapIncidente(row: Record<string, unknown>): Incidente {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    fechaHora: String(row.fecha_hora),
    lugar: String(row.lugar ?? ''),
    tipo: String(row.tipo ?? ''),
    descripcion: String(row.descripcion ?? ''),
    responsable: String(row.responsable ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createIncidente(
  input: CreateIncidenteInput,
  tenantId: string | null,
): Promise<Incidente | null> {
  if (!tenantId) return null;
  const { data, error } = await supabase
    .from('incidentes')
    .insert({
      tenant_id: tenantId,
      fecha_hora: input.fechaHora || new Date().toISOString(),
      lugar: input.lugar.trim(),
      tipo: input.tipo?.trim() || 'Consumo de alcohol',
      descripcion: input.descripcion.trim(),
      responsable: input.responsable.trim(),
    })
    .select(INCIDENTE_COLUMNS)
    .single();
  if (error || !data) {
    console.error('Error creating incidente:', error);
    return null;
  }
  return mapIncidente(data as Record<string, unknown>);
}

export async function fetchIncidente(incidenteId: string): Promise<Incidente | null> {
  const { data, error } = await supabase
    .from('incidentes')
    .select(INCIDENTE_COLUMNS)
    .eq('id', incidenteId)
    .maybeSingle();
  if (error) {
    console.error('Error fetching incidente:', error);
    return null;
  }
  return data ? mapIncidente(data as Record<string, unknown>) : null;
}

export async function fetchIncidenteCausas(incidenteId: string): Promise<IncidenteCausaSummary[]> {
  const { data, error } = await supabase
    .from('causas')
    .select(
      'id,estudiante_nombre,nna_protected_name,estudiante_curso,estado_actual,tipo_infraccion,fecha_ultima_actualizacion',
    )
    .eq('incidente_id', incidenteId)
    .order('fecha_ultima_actualizacion', { ascending: false });
  if (error) {
    console.error('Error fetching incidente causas:', error);
    return [];
  }
  return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    estudianteNombre: String(row.estudiante_nombre ?? ''),
    nnaProtectedName: String(row.nna_protected_name ?? ''),
    estudianteCurso: String(row.estudiante_curso ?? ''),
    estadoActual: row.estado_actual as Causa['estadoActual'],
    tipoInfraccion: row.tipo_infraccion as Causa['tipoInfraccion'],
    fechaUltimaActualizacion: String(row.fecha_ultima_actualizacion ?? ''),
  }));
}

export async function fetchIncidenteSharedActivity(
  incidenteId: string,
  causas: IncidenteCausaSummary[],
): Promise<IncidenteSharedActivity[]> {
  const causaIds = causas.map((causa) => causa.id);
  if (causaIds.length === 0) return [];

  const [bitacoraResult, progressResult] = await Promise.all([
    supabase
      .from('bitacora_entries')
      .select('id,causa_id,fecha,tipo,titulo,descripcion,documento_adjunto')
      .in('causa_id', causaIds)
      .eq('compartido_grupal', true),
    supabase
      .from('checklist_progress_entries')
      .select(
        'id,causa_id,title,description,entry_type,occurred_at,document_name,document_url,incidente_id',
      )
      .in('causa_id', causaIds)
      .eq('incidente_id', incidenteId),
  ]);

  if (bitacoraResult.error) console.error('Error fetching shared milestones:', bitacoraResult.error);
  if (progressResult.error) console.error('Error fetching shared progress:', progressResult.error);

  const activities: IncidenteSharedActivity[] = [
    ...((bitacoraResult.data || []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      kind: 'hito' as const,
      sourceCausaId: String(row.causa_id),
      title: String(row.titulo ?? ''),
      description: String(row.descripcion ?? ''),
      entryType: String(row.tipo ?? 'Otro'),
      occurredAt: String(row.fecha),
      documentUrl: row.documento_adjunto
        ? normalizeDocumentPath(String(row.documento_adjunto)) || undefined
        : undefined,
    })),
    ...((progressResult.data || []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      kind: 'avance' as const,
      sourceCausaId: String(row.causa_id),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      entryType: String(row.entry_type ?? 'Otro'),
      occurredAt: String(row.occurred_at),
      documentName: row.document_name ? String(row.document_name) : undefined,
      documentUrl: row.document_url
        ? normalizeDocumentPath(String(row.document_url)) || undefined
        : undefined,
    })),
  ];

  return activities.sort(
    (first, second) =>
      new Date(second.occurredAt).getTime() - new Date(first.occurredAt).getTime(),
  );
}
