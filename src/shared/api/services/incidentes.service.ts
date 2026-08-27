/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';
import type { Causa, Incidente } from '../../lib/types';

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
