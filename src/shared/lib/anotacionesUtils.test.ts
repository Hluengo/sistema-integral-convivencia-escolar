/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { maskName, maskRut } from './anotacionesUtils';

test('maskName no modifica el nombre si privacyMode está apagado', () => {
  assert.equal(maskName('Juan Pérez Soto', false), 'Juan Pérez Soto');
});

test('maskName enmascara sin exponer caracteres del apellido', () => {
  const masked = maskName('Juan Pérez Soto', true);
  assert.equal(masked, 'J••• P. S•••');
  // No debe contener el apellido completo ni el segundo nombre.
  assert.ok(!masked.includes('Pérez'));
  assert.ok(!masked.includes('Soto'));
});

test('maskName conserva la inicial del primer nombre', () => {
  const masked = maskName('Antonia', true);
  assert.ok(masked.startsWith('A'));
  assert.ok(!masked.includes('ntonia'));
});

test('maskRut devuelve N/A sin RUT', () => {
  assert.equal(maskRut(undefined), 'N/A');
});

test('maskRut no modifica el RUT si privacyMode está apagado', () => {
  assert.equal(maskRut('12.345.678-9', false), '12.345.678-9');
});

test('maskRut enmascara los últimos dígitos y el dígito verificador', () => {
  const masked = maskRut('12.345.678-9', true);
  assert.equal(masked, '12.345.***-*');
  assert.ok(!masked.includes('678'));
  assert.ok(!masked.includes('-9'));
});

test('maskRut devuelve formato genérico para RUT malformado', () => {
  assert.equal(maskRut('12345678', true), '**.***.***-*');
});
