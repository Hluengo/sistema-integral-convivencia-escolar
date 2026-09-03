/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { EstadoCausa, type Causa } from '../types';
import {
  verificarPlazoInformeConcluyente,
  verificarPlazoInvestigacion,
  verificarPlazoSuspension,
} from './deadlineValidators';
import {
  calcularFechaLimiteInvestigacion,
  calcularFechaLimiteNotificacionSuperintendencia,
} from './deadlineCalculators';
import { calcularDiasHabiles } from './dateUtils';
import {
  MAX_PLAZO_INVESTIGACION_DIAS,
  PLAZO_INVESTIGACION_ALTA_COMPLEJIDAD_DIAS,
  PLAZO_INFORME_CONCLUYENTE_DIAS,
  PLAZO_TOTAL_ALTA_COMPLEJIDAD_DIAS,
  MAX_PLAZO_SUSPENSION_DIAS,
  MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS,
  getMaxPlazoInvestigacionDias,
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

const cierreIndagacion = (fechaCompletado: string): Causa['checklistDebidoProceso'][number] => ({
  id: 'chk_res_2',
  label: 'Informe Cierre de Indagación Emitido',
  descripcion: '',
  completado: true,
  fechaCompletado,
  requeridoPor: 'Reglamento Interno',
});

const informeConcluyente = (fechaCompletado: string): Causa['checklistDebidoProceso'][number] => ({
  id: 'chk_res_6',
  label: 'Informe Concluyente Emitido',
  descripcion: '',
  completado: true,
  fechaCompletado,
  requeridoPor: 'Reglamento Interno',
});

test('constantes legales centralizadas: investigación 60/10, concluyente 5, suspensión 15', () => {
  assert.equal(MAX_PLAZO_INVESTIGACION_DIAS, 60);
  assert.equal(PLAZO_INVESTIGACION_ALTA_COMPLEJIDAD_DIAS, 10);
  assert.equal(PLAZO_INFORME_CONCLUYENTE_DIAS, 5);
  assert.equal(PLAZO_TOTAL_ALTA_COMPLEJIDAD_DIAS, 15);
  assert.equal(MAX_PLAZO_SUSPENSION_DIAS, 15);
  assert.equal(MAX_PLAZO_NOTIFICACION_SUPERINTENDENCIA_DIAS, 5);
});

test('calcularFechaLimiteInvestigacion suma 60 días hábiles desde apertura', () => {
  const resultado = calcularFechaLimiteInvestigacion('2026-08-03');
  // Invariante: entre apertura y límite hay exactamente 60 días hábiles.
  assert.equal(calcularDiasHabiles('2026-08-03', resultado), 60);
  assert.ok(resultado > '2026-08-03');
});

test('calcularFechaLimiteInvestigacion suma 10 días hábiles para faltas Muy Graves y Gravísimas', () => {
  for (const tipoInfraccion of ['Muy Grave', 'Gravísima'] as const) {
    const resultado = calcularFechaLimiteInvestigacion('2026-08-03', tipoInfraccion);
    assert.equal(getMaxPlazoInvestigacionDias(tipoInfraccion), 10);
    assert.equal(calcularDiasHabiles('2026-08-03', resultado), 10);
  }
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

test('verificarPlazoInvestigacion usa 10 días hábiles para faltas Muy Graves', () => {
  const causa = makeCausa({ fechaApertura: '2026-08-03', tipoInfraccion: 'Muy Grave' });
  const result = verificarPlazoInvestigacion(causa);
  assert.equal(result.fechaLimite, calcularFechaLimiteInvestigacion('2026-08-03', 'Muy Grave'));
  assert.match(result.mensaje, /10|Plazo de investigación/);
});

test('verificarPlazoInvestigacion evalúa contra el hito de cierre de indagación', () => {
  const enPlazo = verificarPlazoInvestigacion(
    makeCausa({
      fechaApertura: '2026-08-13',
      fechaInicioInvestigacion: '2026-08-13',
      tipoInfraccion: 'Gravísima',
      checklistDebidoProceso: [cierreIndagacion('2026-08-26')],
    }),
  );
  const fueraPlazo = verificarPlazoInvestigacion(
    makeCausa({
      fechaApertura: '2026-08-13',
      fechaInicioInvestigacion: '2026-08-13',
      tipoInfraccion: 'Gravísima',
      checklistDebidoProceso: [cierreIndagacion('2026-08-27')],
    }),
  );

  assert.equal(enPlazo.estado, 'cumplido');
  assert.equal(enPlazo.fechaLimite, '2026-08-26');
  assert.equal(fueraPlazo.estado, 'vencido');
  assert.match(fueraPlazo.mensaje, /cerró fuera/);
});

test('prioriza la fecha del hito de inicio sobre una fecha persistida anterior', () => {
  const result = verificarPlazoInformeConcluyente(
    makeCausa({
      fechaApertura: '2026-08-13',
      fechaInicioInvestigacion: '2026-08-13',
      tipoInfraccion: 'Gravísima',
      checklistDebidoProceso: [
        {
          id: 'chk_rec_3',
          label: 'Notificación de Inicio de Indagación',
          descripcion: '',
          completado: true,
          fechaCompletado: '2026-08-14',
          requeridoPor: 'Circular 482',
        },
        cierreIndagacion('2026-08-27'),
        informeConcluyente('2026-09-03'),
      ],
    }),
  );

  assert.equal(result.estado, 'cumplido');
  assert.equal(result.fechaLimite, '2026-09-03');
});

test('verificarPlazoInformeConcluyente separa los 5 días finales y el total de 15', () => {
  const enPlazo = verificarPlazoInformeConcluyente(
    makeCausa({
      fechaApertura: '2026-08-13',
      fechaInicioInvestigacion: '2026-08-13',
      tipoInfraccion: 'Gravísima',
      checklistDebidoProceso: [
        cierreIndagacion('2026-08-26'),
        informeConcluyente('2026-09-02'),
      ],
    }),
  );
  const fueraPlazo = verificarPlazoInformeConcluyente(
    makeCausa({
      fechaApertura: '2026-08-13',
      fechaInicioInvestigacion: '2026-08-13',
      tipoInfraccion: 'Gravísima',
      checklistDebidoProceso: [
        cierreIndagacion('2026-08-26'),
        informeConcluyente('2026-09-03'),
      ],
    }),
  );

  assert.equal(enPlazo.estado, 'cumplido');
  assert.equal(enPlazo.fechaLimite, '2026-09-02');
  assert.equal(fueraPlazo.estado, 'vencido');
  assert.match(fueraPlazo.mensaje, /15 días/);
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
    fechaInicioSuspension: '2099-01-01', // futuro estable: aún no vence
    duracionSuspensionDias: 5,
  });
  const result = verificarPlazoSuspension(causa);
  assert.equal(result.estado, 'cumplido');
});

test('verificarPlazoSuspension no_iniciado sin suspensión', () => {
  const causa = makeCausa();
  assert.equal(verificarPlazoSuspension(causa).estado, 'no_iniciado');
});
