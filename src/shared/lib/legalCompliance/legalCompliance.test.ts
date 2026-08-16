/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { EstadoCausa, type Causa } from '../types';
import { verificarPlazoInvestigacion, verificarPlazoSuspension } from './deadlineValidators';
import {
  calcularFechaLimiteInvestigacion,
  calcularFechaLimiteNotificacionSuperintendencia,
} from './deadlineCalculators';
import { calcularDiasHabiles } from './dateUtils';
import {
  MAX_PLAZO_INVESTIGACION_DIAS,
  MAX_PLAZO_SUSPENSION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
} from './constants';

function makeCausa(overrides: Partial<Causa> = {}): Causa {
  return {
    id: 'DC-2026-001',
    estudianteNombre: 'Estudiante',
    estudianteCurso: '8° Básico A',
    nnaProtectedName: 'E.P.',
    runEstudiante: '23.456.789-K',
    fechaApertura: '2026-08-03',
    estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
    tipoInfraccion: 'Grave',
    responsable: 'Inspectoría',
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: '2026-08-03',
    observaciones: '',
    bitacora: [],
    checklistDebidoProceso: [],
    ...overrides,
  };
}

test('constantes legales centralizadas: investigación 60, suspensión 15, Superintendencia 5', () => {
  assert.equal(MAX_PLAZO_INVESTIGACION_DIAS, 60);
  assert.equal(MAX_PLAZO_SUSPENSION_DIAS, 15);
  assert.equal(MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS, 5);
});

test('calcularFechaLimiteInvestigacion suma 60 días hábiles desde apertura', () => {
  const resultado = calcularFechaLimiteInvestigacion('2026-08-03');
  // Invariante: entre apertura y límite hay exactamente 60 días hábiles.
  assert.equal(calcularDiasHabiles('2026-08-03', resultado), 60);
  assert.ok(resultado > '2026-08-03');
});

test('calcularFechaLimiteNotificacionSuperintendencia suma 5 días hábiles desde resolución', () => {
  const resultado = calcularFechaLimiteNotificacionSuperintendencia('2026-09-07');
  // agregarDiasHabiles cuenta desde el día siguiente; desde un lunes, 5 días
  // hábiles después cae en el lunes siguiente (2026-09-14).
  assert.equal(resultado, '2026-09-14');
});

test('verificarPlazoInvestigacion vencido cuando supera 60 días hábiles', () => {
  const causa = makeCausa({ fechaApertura: '2026-01-05' }); // más de 60 días hábiles atrás
  const result = verificarPlazoInvestigacion(causa);
  assert.equal(result.estado, 'vencido');
  assert.match(result.mensaje, /60/);
});

test('verificarPlazoInvestigacion cumplido con fecha reciente', () => {
  const causa = makeCausa({ fechaApertura: '2026-08-10' });
  const result = verificarPlazoInvestigacion(causa);
  assert.ok(['cumplido', 'alerta'].includes(result.estado));
  assert.equal(typeof result.diasRestantes, 'number');
});

test('verificarPlazoInvestigacion no_iniciado sin fecha de apertura', () => {
  const causa = makeCausa({ fechaApertura: '' });
  assert.equal(verificarPlazoInvestigacion(causa).estado, 'no_iniciado');
});

test('verificarPlazoSuspension excede el máximo legal de 15 días', () => {
  const causa = makeCausa({
    fechaInicioSuspension: '2026-08-10',
    duracionSuspensionDias: 20,
  });
  const result = verificarPlazoSuspension(causa);
  assert.equal(result.estado, 'vencido');
  assert.match(result.mensaje, /15/);
});

test('verificarPlazoSuspension cumplido dentro del máximo', () => {
  const causa = makeCausa({
    fechaInicioSuspension: '2026-08-17', // futuro: aún no vence
    duracionSuspensionDias: 5,
  });
  const result = verificarPlazoSuspension(causa);
  assert.equal(result.estado, 'cumplido');
});

test('verificarPlazoSuspension no_iniciado sin suspensión', () => {
  const causa = makeCausa();
  assert.equal(verificarPlazoSuspension(causa).estado, 'no_iniciado');
});
