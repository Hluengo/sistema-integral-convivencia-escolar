import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDate } from './constants';

describe('formatDate', () => {
  it('mantiene el día de una fecha civil sin convertirla desde UTC', () => {
    assert.equal(formatDate('2026-07-29'), '29-07-2026');
  });

  it('formatea los eventos con hora en la zona de Chile', () => {
    assert.match(formatDate('2026-07-29T20:30:00.000Z'), /29-07-2026/);
  });

  it('conserva valores no reconocidos para evitar ocultar datos', () => {
    assert.equal(formatDate('fecha-desconocida'), 'fecha-desconocida');
  });
});
