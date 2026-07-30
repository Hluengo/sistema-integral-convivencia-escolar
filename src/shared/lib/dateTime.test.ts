import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatChileDate, formatChileDateTime } from './dateTime';

describe('dateTime de Chile', () => {
  it('mantiene el día de una fecha civil sin convertirla desde UTC', () => {
    assert.equal(formatChileDate('2026-07-29'), '29-07-2026');
  });

  it('convierte un timestamp UTC al horario de invierno de Chile', () => {
    assert.match(formatChileDateTime('2026-07-29T03:30:00.000Z'), /28-07-2026.*23:30/);
  });

  it('convierte un timestamp UTC al horario de verano de Chile', () => {
    assert.match(formatChileDateTime('2026-12-10T03:30:00.000Z'), /10-12-2026.*00:30/);
  });

  it('conserva valores no reconocidos para evitar ocultar datos', () => {
    assert.equal(formatChileDate('fecha-desconocida'), 'fecha-desconocida');
  });
});
