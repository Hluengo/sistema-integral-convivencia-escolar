/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from 'zod';
import { EstadoCausa } from '../types';
import { isChileanRutFormat, tipoInfraccionValues } from './newCausaForm';

const EstadoCausaEnum = z.enum(Object.values(EstadoCausa) as [EstadoCausa, ...EstadoCausa[]]);

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
