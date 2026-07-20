/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from 'zod';
import { EstadoCausa } from '../types';

export const CourseSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number(),
  level: z.enum(['BASICA', 'MEDIA']),
  created_at: z.string(),
});

export const StudentSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  course_id: z.string(),
  rut: z.string(),
  created_at: z.string(),
});

export const StudentWithCourseSchema = StudentSchema.extend({
  course_name: z.string(),
  course_level: z.enum(['BASICA', 'MEDIA']).nullable(),
});

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

export const EstadoCausaEnum = z.nativeEnum(EstadoCausa);

export const TipoInfraccionEnum = z.enum(['Leve', 'Grave', 'Muy Grave', 'Gravísima']);

export const FaseProcedimentalSchema = z.enum(['Recepción', 'Investigación', 'Resolución', 'Apelación', 'Seguimiento']);

export const CausaSchema = z.object({
  id: z.string(),
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

export const StatisticsSchema = z.object({
  total: z.number(),
  porFase: z.record(FaseProcedimentalSchema, z.number()),
  porGravedad: z.record(TipoInfraccionEnum, z.number()),
  conPlazoCritico: z.number(),
  aulaSeguraActivas: z.number(),
});

export const UserRoleSchema = z.enum(['convivencia_escolar', 'director_rector', 'mediador', 'docente']);

export const DisciplinaryStatusSchema = z.enum(['Verde', 'Amarillo', 'Naranja', 'Rojo']);

export const AnotacionStudentSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  course_id: z.string(),
  teacher_id: z.string(),
  status: z.string(),
  tenant_id: z.string().optional(),
  annotations_count: z.number(),
  positive_annotations_count: z.number(),
  last_annotation_date: z.string().optional(),
  disciplinary_status: DisciplinaryStatusSchema,
  rut: z.string().optional(),
  course_name: z.string().optional(),
});

export const AnnotationSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  text: z.string(),
  date: z.string(),
  severity: TipoInfraccionEnum,
  registered_by: z.string(),
  type: z.enum(['Positiva', 'Negativa']),
  pdf_file_path: z.string().nullable().optional(),
});

export const CartaDisciplinariaSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  letter_type: z.enum(['Amonestación Escrita', 'Carta de Compromiso Conductual']),
  emission_date: z.string(),
  status: z.enum(['Vigente', 'Cumplida', 'Incumplida', 'Anulada']),
  emitted_by: z.string(),
  supervisor_name: z.string().optional(),
  apoderado_name: z.string(),
  annotations_count: z.number(),
  student_name: z.string(),
  course: z.string(),
  regulation_basis: z.string(),
  observations: z.string().optional(),
  created_at: z.string(),
});

export const EtapaDisciplinariaSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  step_number: z.number(),
  stage_name: z.string(),
  responsible: z.string(),
  transition_date: z.string(),
  comment: z.string().optional(),
  created_at: z.string(),
});

export type CourseType = z.infer<typeof CourseSchema>;
export type StudentType = z.infer<typeof StudentSchema>;
export type StudentWithCourseType = z.infer<typeof StudentWithCourseSchema>;
export type CausaType = z.infer<typeof CausaSchema>;
export type BitacoraEntryType = z.infer<typeof BitacoraEntrySchema>;
export type ChecklistItemType = z.infer<typeof ChecklistItemSchema>;
export type AnotacionStudentType = z.infer<typeof AnotacionStudentSchema>;
export type AnnotationType = z.infer<typeof AnnotationSchema>;
export type StatisticsType = z.infer<typeof StatisticsSchema>;
