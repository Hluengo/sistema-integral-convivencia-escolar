/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from 'zod';

export const studentHistoryEntrySchema = z.object({
  studentId: z.string().uuid('El estudiante seleccionado no es válido.'),
  title: z
    .string()
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres.')
    .max(120, 'El título no puede superar los 120 caracteres.'),
  description: z
    .string()
    .trim()
    .min(3, 'La descripción debe tener al menos 3 caracteres.')
    .max(2000, 'La descripción no puede superar los 2.000 caracteres.'),
});

export type StudentHistoryEntryInput = z.infer<typeof studentHistoryEntrySchema>;
