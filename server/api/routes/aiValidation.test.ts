/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_HISTORY_MESSAGE_LENGTH, MAX_HISTORY_MESSAGES, normalizeHistory } from './advisor';
import { isUsableImprovement } from './improve';
import { getBearerToken, getProcessErrorResponse } from './processDisciplinaryPdf';
import { hasSafeProperties, isValidEventName } from './usage';

test('normalizeHistory acepta historial vacío', () => {
  assert.deepEqual(normalizeHistory(undefined), []);
});

test('normalizeHistory normaliza roles y redacta datos sensibles', () => {
  const result = normalizeHistory([
    { role: 'user', content: 'Hola' },
    { role: 'assistant', content: 'Hola, ¿en qué puedo ayudarte?' },
  ]);
  assert.equal(result?.length, 2);
  assert.equal(result?.[0].role, 'user');
  assert.equal(result?.[1].role, 'assistant');
});

test('normalizeHistory rechaza elementos sin contenido', () => {
  assert.equal(normalizeHistory([{ role: 'user', content: '   ' }]), null);
});

test('normalizeHistory rechaza más mensajes del máximo', () => {
  const history = Array.from({ length: MAX_HISTORY_MESSAGES + 1 }, () => ({
    role: 'user' as const,
    content: 'x',
  }));
  assert.equal(normalizeHistory(history), null);
});

test('normalizeHistory rechaza mensajes que superan el largo máximo', () => {
  assert.equal(
    normalizeHistory([{ role: 'user', content: 'x'.repeat(MAX_HISTORY_MESSAGE_LENGTH + 1) }]),
    null,
  );
});

test('normalizeHistory rechaza historial que supera el total máximo', () => {
  const history = Array.from({ length: MAX_HISTORY_MESSAGES }, () => ({
    role: 'user' as const,
    content: 'y'.repeat(MAX_HISTORY_MESSAGE_LENGTH),
  }));
  // 8 * 4000 = 32000 > 16000
  assert.equal(normalizeHistory(history), null);
});

test('normalizeHistory acepta historial dentro del total máximo', () => {
  const history = Array.from({ length: 4 }, () => ({
    role: 'assistant' as const,
    content: 'corto',
  }));
  assert.ok(normalizeHistory(history));
  assert.equal(
    normalizeHistory(history)?.reduce((acc, m) => acc + m.content.length, 0),
    20,
  );
});

test('isUsableImprovement rechaza respuestas vacías', () => {
  assert.equal(isUsableImprovement('texto original', null), false);
  assert.equal(isUsableImprovement('texto original', ''), false);
});

test('isUsableImprovement rechaza negativas de la IA', () => {
  assert.equal(isUsableImprovement('texto original', 'No puedo ayudar con esto.'), false);
});

test('isUsableImprovement rechaza textos sin cambios', () => {
  assert.equal(isUsableImprovement('mismo texto', 'mismo texto'), false);
});

test('isUsableImprovement acepta una mejora real', () => {
  const original = 'La anotación describe el comportamiento observado durante la jornada.';
  const improved =
    'El registro describe el comportamiento observado durante toda la jornada escolar, indicando el contexto de la situación.';
  assert.equal(isUsableImprovement(original, improved), true);
});

test('isValidEventName valida nombres de eventos', () => {
  assert.equal(isValidEventName('causa_creada'), true);
  assert.equal(isValidEventName('CausaCreada'), false);
  assert.equal(isValidEventName(''), false);
  assert.equal(isValidEventName(123), false);
  assert.equal(isValidEventName('x'.repeat(81)), false);
});

test('hasSafeProperties acepta propiedades ausentes o pequeñas', () => {
  assert.equal(hasSafeProperties(undefined), true);
  assert.equal(hasSafeProperties({ a: 1 }), true);
});

test('hasSafeProperties rechaza propiedades gigantes', () => {
  assert.equal(hasSafeProperties({ data: 'x'.repeat(10_000) }), false);
});

test('hasSafeProperties rechaza arrays y valores no-objeto', () => {
  assert.equal(hasSafeProperties([1, 2, 3]), false);
  assert.equal(hasSafeProperties('texto'), false);
  assert.equal(hasSafeProperties(42), false);
});

test('getBearerToken extrae el token del header Authorization', () => {
  const req = { headers: { authorization: 'Bearer abc.def.ghi' } } as never;
  assert.equal(getBearerToken(req), 'abc.def.ghi');
  assert.equal(getBearerToken({ headers: {} } as never), undefined);
  assert.equal(getBearerToken({ headers: { authorization: 'Basic xyz' } } as never), undefined);
});

test('getProcessErrorResponse mapea Supabase no configurado a 503', () => {
  const response = getProcessErrorResponse(new Error('Supabase no configurado'));
  assert.equal(response.status, 503);
  assert.match(response.message, /Supabase no está configurado/);
});

test('getProcessErrorResponse mapea PDF inválido a 400', () => {
  assert.equal(getProcessErrorResponse(new Error('El PDF excede las 20 páginas.')).status, 400);
  assert.equal(getProcessErrorResponse(new Error('Ruta de archivo no válida.')).status, 400);
  assert.equal(
    getProcessErrorResponse(new Error('El hash no coincide con el archivo.')).status,
    400,
  );
});

test('getProcessErrorResponse mapea PDF no descargable a 404', () => {
  const response = getProcessErrorResponse(new Error('No fue posible descargar el archivo'));
  assert.equal(response.status, 404);
});

test('getProcessErrorResponse mapea PDF ya registrado a 409', () => {
  const response = getProcessErrorResponse(new Error('Este PDF ya fue registrado'));
  assert.equal(response.status, 409);
});

test('getProcessErrorResponse usa 500 para errores desconocidos', () => {
  assert.equal(getProcessErrorResponse(new Error('Error inesperado')).status, 500);
  assert.equal(getProcessErrorResponse('string error').status, 500);
  assert.equal(getProcessErrorResponse(undefined).status, 500);
});
