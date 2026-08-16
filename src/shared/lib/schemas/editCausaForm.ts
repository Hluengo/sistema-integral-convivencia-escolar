/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from 'zod';
import { EstadoCausa, type FaseProcedimental } from '../types';
import { getFaseForEstado } from '../data';
import { isChileanRutFormat, tipoInfraccionValues } from './newCausaForm';

const EstadoCausaEnum = z.enum(Object.values(EstadoCausa) as [EstadoCausa, ...EstadoCausa[]]);

const FASE_ORDEN: Record<FaseProcedimental, number> = {
  Recepción: 1,
  Investigación: 2,
  Resolución: 3,
  Apelación: 4,
  Seguimiento: 5,
};

/**
 * Valida que una transición de estado respete el debido proceso: no se puede
 * avanzar saltando una fase completa (p. ej. de Recepción directo a
 * Resolución sin pasar por Investigación). Retroceder siempre se permite,
 * para correcciones administrativas.
 */
export function isValidStateTransition(desde: EstadoCausa, hasta: EstadoCausa): boolean {
  if (desde === hasta) return true;
  const faseOrigen = FASE_ORDEN[getFaseForEstado(desde)];
  const faseDestino = FASE_ORDEN[getFaseForEstado(hasta)];
  // Permitido avanzar a la misma fase o a la siguiente; retroceder libre.
  return faseDestino <= faseOrigen + 1;
}

const optionalDateSchema = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Ingrese una fecha válida.',
  });

export const editCausaFormSchema = z.object({
  estudianteNombre: z.string().trim().min(2, 'Ingrese el nombre del estudiante.'),
  estudianteCurso: z.string().trim(),
  runEstudiante: z
    .string()
    .trim()
    .refine((value) => !value || isChileanRutFormat(value), {
      message: 'Ingrese un RUN chileno válido.',
    }),
  tipoInfraccion: z.enum(tipoInfraccionValues),
  responsable: z.string().trim().min(3, 'Ingrese el encargado o responsable.'),
  estadoActual: EstadoCausaEnum,
  observaciones: z.string().trim(),
  comprometeAulaSegura: z.boolean(),
  esDenunciaConfidencial: z.boolean(),
  identidadReservada: z.boolean(),
  fechaInicioInvestigacion: optionalDateSchema,
  fechaInicioSuspension: optionalDateSchema,
  duracionSuspensionDias: z
    .number()
    .int('Ingrese un número entero.')
    .min(0, 'La suspensión no puede ser negativa.')
    .max(15, 'La suspensión preventiva no puede exceder 15 días.'),
  monitoreoPedagogico: z.boolean(),
  requiereNotificacionSuperintendencia: z.boolean(),
  fechaNotificacionSuperintendencia: optionalDateSchema,
  estudianteTieneNEE: z.boolean(),
  tipoNEE: z.string().trim(),
});

export type EditCausaFormValues = z.infer<typeof editCausaFormSchema>;
