/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { loginFormSchema, passwordResetRequestSchema, passwordUpdateFormSchema } from './loginForm';

test('loginFormSchema exige correo válido y contraseña', () => {
  assert.equal(
    loginFormSchema.safeParse({ email: 'usuario@colegio.cl', password: '123456' }).success,
    true,
  );
  assert.equal(loginFormSchema.safeParse({ email: 'correo', password: '123' }).success, false);
});

test('passwordResetRequestSchema valida solo el correo', () => {
  assert.equal(passwordResetRequestSchema.safeParse({ email: 'usuario@colegio.cl' }).success, true);
  assert.equal(passwordResetRequestSchema.safeParse({ email: '' }).success, false);
});

test('passwordUpdateFormSchema exige confirmación coincidente', () => {
  assert.equal(
    passwordUpdateFormSchema.safeParse({
      password: '123456',
      passwordConfirmation: '123456',
    }).success,
    true,
  );
  assert.equal(
    passwordUpdateFormSchema.safeParse({
      password: '123456',
      passwordConfirmation: '654321',
    }).success,
    false,
  );
});
