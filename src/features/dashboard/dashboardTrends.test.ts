/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { EstadoCausa, type Causa, type TipoInfraccion } from '../../shared/lib/types';
import {
  buildDashboardTrendSummary,
  getDashboardSchoolYear,
  type AnnotationTrendRecord,
} from './dashboardTrends';

function makeCausa(overrides: {
  id: string;
  fechaApertura: string;
  fechaUltimaActualizacion?: string;
  estadoActual?: EstadoCausa;
  tipoInfraccion?: TipoInfraccion;
}): Causa {
  return {
    id: overrides.id,
    estudianteNombre: 'Estudiante Demo',
    estudianteCurso: '8° Básico',
    nnaProtectedName: 'E.D.',
    runEstudiante: '11.111.111-1',
    fechaApertura: overrides.fechaApertura,
    estadoActual: overrides.estadoActual ?? EstadoCausa.EN_PROCESO_INDAGACION,
    tipoInfraccion: overrides.tipoInfraccion ?? 'Grave',
    responsable: 'Convivencia Escolar',
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: overrides.fechaUltimaActualizacion ?? overrides.fechaApertura,
    observaciones: '',
    bitacora: [],
    checklistDebidoProceso: [],
  };
}

test('buildDashboardTrendSummary agrupa aperturas y cierres entre marzo y diciembre', () => {
  const summary = buildDashboardTrendSummary(
    [
      makeCausa({ id: 'feb', fechaApertura: '2026-02-10', tipoInfraccion: 'Gravísima' }),
      makeCausa({ id: '1', fechaApertura: '2026-03-10', tipoInfraccion: 'Leve' }),
      makeCausa({
        id: '2',
        fechaApertura: '2026-07-04',
        fechaUltimaActualizacion: '2026-08-02',
        estadoActual: EstadoCausa.CAUSA_CERRADA,
        tipoInfraccion: 'Gravísima',
      }),
      makeCausa({ id: '3', fechaApertura: '2026-08-01', tipoInfraccion: 'Muy Grave' }),
      makeCausa({ id: 'jan', fechaApertura: '2027-01-05', tipoInfraccion: 'Muy Grave' }),
      makeCausa({ id: 'old', fechaApertura: '2025-12-01', tipoInfraccion: 'Gravísima' }),
    ],
    [],
    new Date('2026-08-15T12:00:00Z'),
  );

  assert.deepEqual(
    summary.points.map((point) => point.key),
    [
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ],
  );
  assert.equal(summary.schoolYear, 2026);
  assert.equal(summary.points[0].opened, 1);
  assert.equal(summary.points[4].opened, 1);
  assert.equal(summary.points[5].opened, 1);
  assert.equal(summary.points[5].closed, 1);
  assert.equal(summary.highSeverityShare, 67);
  assert.equal(summary.closureRate, 33);
});

test('buildDashboardTrendSummary agrega anotaciones anuales por mes', () => {
  const annotations: AnnotationTrendRecord[] = [
    { dateTime: '2026-02-20T12:00:00Z', type: 'Negativa', severity: 'Gravísima' },
    { dateTime: '2026-03-10T12:00:00Z', type: 'Negativa', severity: 'Grave' },
    { dateTime: '2026-03-12T12:00:00Z', type: 'Positiva', severity: 'Leve' },
    { dateTime: '2026-10-01T12:00:00Z', type: 'Negativa', severity: 'Muy Grave' },
    { dateTime: '2027-01-02T12:00:00Z', type: 'Negativa', severity: 'Gravísima' },
  ];

  const summary = buildDashboardTrendSummary([], annotations, new Date('2026-12-15T12:00:00Z'));

  assert.equal(summary.annotationTotal, 3);
  assert.equal(summary.negativeAnnotationTotal, 2);
  assert.equal(summary.highSeverityAnnotationTotal, 1);
  assert.equal(summary.points[0].annotations, 2);
  assert.equal(summary.points[0].negativeAnnotations, 1);
  assert.equal(summary.points[7].annotations, 1);
  assert.equal(summary.points[7].highSeverityAnnotations, 1);
  assert.equal(summary.busiestAnnotationMonthLabel, 'mar');
});

test('buildDashboardTrendSummary compara segundo semestre escolar contra el primero', () => {
  const summary = buildDashboardTrendSummary(
    [
      makeCausa({ id: '1', fechaApertura: '2026-03-01' }),
      makeCausa({ id: '2', fechaApertura: '2026-04-01' }),
      makeCausa({ id: '3', fechaApertura: '2026-06-01' }),
      makeCausa({ id: '4', fechaApertura: '2026-07-01' }),
      makeCausa({ id: '5', fechaApertura: '2026-08-01' }),
    ],
    [],
    new Date('2026-08-15T12:00:00Z'),
  );

  assert.equal(summary.previousOpened, 4);
  assert.equal(summary.currentOpened, 1);
  assert.equal(summary.openedDelta, -3);
  assert.equal(summary.busiestMonthTotal, 1);
});

test('buildDashboardTrendSummary marca mes actual y meses futuros del ciclo escolar', () => {
  const summary = buildDashboardTrendSummary(
    [
      makeCausa({ id: 'observed', fechaApertura: '2026-03-01' }),
      makeCausa({ id: 'future', fechaApertura: '2026-09-01' }),
    ],
    [{ dateTime: '2026-10-01T12:00:00Z', type: 'Negativa', severity: 'Muy Grave' }],
    new Date('2026-08-15T12:00:00Z'),
  );

  assert.equal(summary.points[5].key, '2026-08');
  assert.equal(summary.points[5].isCurrentMonth, true);
  assert.equal(summary.points[5].isObserved, true);
  assert.equal(summary.points[6].key, '2026-09');
  assert.equal(summary.points[6].isObserved, false);
  assert.equal(summary.observedMonthCount, 6);
  assert.equal(summary.openedTotal, 1);
  assert.equal(summary.annotationTotal, 0);
});

test('buildDashboardTrendSummary calcula brecha, cierre y porcentajes por mes observado', () => {
  const summary = buildDashboardTrendSummary(
    [
      makeCausa({
        id: 'closed',
        fechaApertura: '2026-03-01',
        fechaUltimaActualizacion: '2026-03-20',
        estadoActual: EstadoCausa.CAUSA_CERRADA,
      }),
      makeCausa({ id: 'open', fechaApertura: '2026-03-12' }),
    ],
    [
      { dateTime: '2026-03-02T12:00:00Z', type: 'Negativa', severity: 'Grave' },
      { dateTime: '2026-03-03T12:00:00Z', type: 'Negativa', severity: 'Muy Grave' },
      { dateTime: '2026-03-04T12:00:00Z', type: 'Positiva', severity: 'Leve' },
    ],
    new Date('2026-08-15T12:00:00Z'),
  );

  const march = summary.points[0];
  assert.equal(march.netLoad, 1);
  assert.equal(march.closureRate, 50);
  assert.equal(march.negativeAnnotationShare, 67);
  assert.equal(march.highSeverityAnnotationShare, 33);
  assert.equal(summary.openedTotal, 2);
  assert.equal(summary.closedTotal, 1);
  assert.equal(summary.netLoadTotal, 1);
  assert.equal(summary.negativeAnnotationShare, 67);
  assert.equal(summary.riskMonthLabel, 'mar');
});

test('getDashboardSchoolYear usa el ciclo escolar marzo-diciembre', () => {
  assert.equal(getDashboardSchoolYear(new Date('2026-02-28T12:00:00Z')), 2025);
  assert.equal(getDashboardSchoolYear(new Date('2026-03-01T12:00:00Z')), 2026);
  assert.equal(getDashboardSchoolYear(new Date('2026-12-31T12:00:00Z')), 2026);
});
