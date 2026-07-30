/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from 'zod';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const physicalCartaRegistrationSchema = z.object({
  studentId: z.string().uuid('El estudiante no es válido.'),
  letterType: z.enum(['Amonestación Escrita', 'Carta de Compromiso Conductual']),
  emissionDate: z
    .string()
    .regex(ISO_DATE_PATTERN, 'Ingrese una fecha válida.')
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00`)), 'Ingrese una fecha válida.'),
  observations: z
    .string()
    .trim()
    .max(1000, 'La observación no puede superar 1000 caracteres.')
    .optional(),
});

export type PhysicalCartaRegistrationInput = z.infer<typeof physicalCartaRegistrationSchema>;
