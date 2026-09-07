/** @license SPDX-License-Identifier: Apache-2.0 */

/**
 * Esquema compartido cliente/servidor para POST /api/draft-document.
 * Reutiliza los mismos rangos que el formulario cliente (zod) en vez de
 * validar a mano con requireStr/optStr, para que ambos lados diverjan menos.
 */
import { z } from "zod";

z.config({ jitless: true });

export const DOC_TYPES = [
  "informe_cierre_indagacion",
  "informe_concluyente",
] as const;

const bitacoraEntryInputSchema = z.object({
  titulo: z.unknown().optional(),
  fecha: z.unknown().optional(),
  tipo: z.unknown().optional(),
  descripcion: z.unknown().optional(),
  participantes: z.unknown().optional(),
  documentoAdjunto: z.unknown().optional(),
});

const checklistItemInputSchema = z.object({
  label: z.unknown().optional(),
  completado: z.unknown().optional(),
  descripcion: z.unknown().optional(),
  registradoPor: z.unknown().optional(),
  fechaCompletado: z.unknown().optional(),
  observaciones: z.unknown().optional(),
  documentoNombre: z.unknown().optional(),
  documentoUrl: z.unknown().optional(),
});

export const draftDocumentBodySchema = z.object({
  docType: z.enum(DOC_TYPES, "Tipo de documento no válido."),
  id: z.string().trim().min(1, "Campo requerido faltante: id").max(100),
  studentName: z
    .string()
    .trim()
    .min(1, "Campo requerido faltante: studentName")
    .max(200),
  course: z.string().max(100).optional().default(""),
  fatherName: z.string().max(200).optional().default(""),
  managerName: z.string().max(200).optional().default(""),
  infractionType: z.string().max(100).optional().default(""),
  observations: z.string().max(5000).optional().default(""),
  fechaApertura: z.string().max(50).optional().default(""),
  estadoActual: z.string().max(80).optional().default(""),
  fechaUltimaActualizacion: z.string().max(50).optional().default(""),
  medidasEjecutadas: z.array(z.unknown()).optional().default([]),
  bitacora: z.array(bitacoraEntryInputSchema).optional().default([]),
  checklist: z.array(checklistItemInputSchema).optional().default([]),
});

export type DraftDocumentBody = z.infer<typeof draftDocumentBodySchema>;
