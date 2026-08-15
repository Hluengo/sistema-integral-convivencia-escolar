/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from 'zod';
import { EstadoCausa } from '../types';

// Keep Zod validation compatible with the production CSP. Without jitless,
// Zod probes `new Function`, which Chrome reports as a blocked eval attempt.
z.config({ jitless: true });

export const BitacoraEntrySchema = z.object({
  id: z.string(),
  fecha: z.string(),
  tipo: z.enum(['Entrevista', 'Evidencia', 'Notificación', 'Mediación', 'Resolución', 'Otro']),
  titulo: z.string(),
  descripcion: z.string(),
  participantes: z.array(z.string()),
  documentoAdjunto: z.string().optional(),
});

export const ChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  descripcion: z.string(),
  completado: z.boolean(),
  fechaCompletado: z.string().optional(),
  requeridoPor: z.enum(['Circular 482', 'Ley 21809', 'Reglamento Interno', 'Ambas']),
  registradoPor: z.string().optional(),
  observaciones: z.string().optional(),
  documentoNombre: z.string().optional(),
  documentoUrl: z.string().optional(),
});

export const ChecklistProgressEntrySchema = z.object({
  id: z.string(),
  causaId: z.string(),
  checklistItemId: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  entryType: z.enum(['Entrevista', 'Evidencia', 'Notificación', 'Mediación', 'Resolución', 'Otro']),
  occurredAt: z.string(),
  documentName: z.string().optional(),
  documentUrl: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
  invalidatedAt: z.string().optional(),
  invalidatedBy: z.string().optional(),
  invalidationReason: z.string().optional(),
});

const EstadoCausaEnum = z.enum(Object.values(EstadoCausa));

const TipoInfraccionEnum = z.enum(['Leve', 'Grave', 'Muy Grave', 'Gravísima']);

export const CausaSchema = z.object({
  id: z.string(),
  studentId: z.string().uuid().optional(),
  estudianteNombre: z.string(),
  estudianteCurso: z.string(),
  nnaProtectedName: z.string(),
  runEstudiante: z.string(),
  fechaApertura: z.string(),
  estadoActual: EstadoCausaEnum,
  tipoInfraccion: TipoInfraccionEnum,
  responsable: z.string(),
  comprometeAulaSegura: z.boolean(),
  fechaUltimaActualizacion: z.string(),
  observaciones: z.string(),
  bitacora: z.array(BitacoraEntrySchema),
  checklistDebidoProceso: z.array(ChecklistItemSchema),
  conductaRiceId: z.string().optional(),
  medidasEjecutadas: z.array(z.string()).optional(),
  esDenunciaConfidencial: z.boolean().optional(),
  denunciantAnonimo: z.boolean().optional(),
  identidadReservada: z.boolean().optional(),
  fechaInicioInvestigacion: z.string().optional(),
  plazoInvestigacionDias: z.number().optional(),
  fechaLimiteInvestigacion: z.string().optional(),
  fechaInicioSuspension: z.string().optional(),
  duracionSuspensionDias: z.number().optional(),
  fechaFinSuspension: z.string().optional(),
  monitoreoPedagogico: z.boolean().optional(),
  requiereNotificacionSuperintendencia: z.boolean().optional(),
  fechaNotificacionSuperintendencia: z.string().optional(),
  plazoNotificacionDias: z.number().optional(),
  fechaLimiteNotificacion: z.string().optional(),
  medidasProteccionVictima: z.array(z.string()).optional(),
  medidasProteccionDenunciado: z.array(z.string()).optional(),
  estudianteTieneNEE: z.boolean().optional(),
  tipoNEE: z.string().optional(),
  sancionesNEEDesactivadas: z.boolean().optional(),
});
