import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDraftCausa, formatSequentialCaseId, generateInitials } from './causaFactory';
import { EstadoCausa } from '../types';

describe('causaFactory', () => {
  it('formats sequential case ids with padding', () => {
    assert.equal(formatSequentialCaseId(1, 2026), 'DC-2026-001');
    assert.equal(formatSequentialCaseId(12, 2026), 'DC-2026-012');
    assert.equal(formatSequentialCaseId(123, 2026), 'DC-2026-123');
  });

  it('generates protected student initials', () => {
    assert.equal(generateInitials('Juan Pedro Muñoz Soto'), 'J. P. M. S.');
    assert.equal(generateInitials(''), 'N. N.');
  });

  it('creates a new causa with required default structures', () => {
    const causa = createDraftCausa({
      counter: 1,
      estudianteNombre: 'Juan Pedro Muñoz Soto',
      estudianteCurso: '1° Medio A',
      runEstudiante: '12.345.678-9',
      tipoInfraccion: 'Grave',
      comprometeAulaSegura: false,
      observaciones: '',
      responsable: 'Esteban Valenzuela (Encargado de Convivencia)',
    });

    assert.equal(causa.id.startsWith('DC-'), true);
    assert.equal(causa.estadoActual, EstadoCausa.DENUNCIA_RECEPCIONADA);
    assert.equal(causa.nnaProtectedName, 'J. P. M. S.');
    assert.equal(causa.bitacora.length, 1);
    assert.equal(causa.checklistDebidoProceso.length > 0, true);
  });
});
