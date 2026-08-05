/** @license SPDX-License-Identifier: Apache-2.0 */

import { z } from 'zod';

const emailSchema = z.email('Ingrese un correo electrónico válido.');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.');

export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordUpdateFormSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: passwordSchema,
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Las contraseñas no coinciden.',
  });

export interface LoginFormValues {
  email: string;
  password: string;
  passwordConfirmation: string;
}
