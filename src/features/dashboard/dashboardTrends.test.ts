/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { EstadoCausa, type Causa, type TipoInfraccion } from '../../shared/lib/types';
import { buildDashboardTrendSummary } from './dashboardTrends';

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

test('buildDashboardTrendSummary agrupa aperturas y cierres en los ultimos seis meses', () => {
  const summary = buildDashboardTrendSummary(
    [
      makeCausa({ id: '1', fechaApertura: '2026-03-10', tipoInfraccion: 'Leve' }),
      makeCausa({
        id: '2',
        fechaApertura: '2026-07-04',
        fechaUltimaActualizacion: '2026-08-02',
        estadoActual: EstadoCausa.CAUSA_CERRADA,
        tipoInfraccion: 'Gravísima',
      }),
      makeCausa({ id: '3', fechaApertura: '2026-08-01', tipoInfraccion: 'Muy Grave' }),
      makeCausa({ id: 'old', fechaApertura: '2025-12-01', tipoInfraccion: 'Gravísima' }),
    ],
    new Date('2026-08-15T12:00:00Z'),
  );

  assert.deepEqual(
    summary.points.map((point) => point.key),
    ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
  );
  assert.equal(summary.points[0].opened, 1);
  assert.equal(summary.points[4].opened, 1);
  assert.equal(summary.points[5].opened, 1);
  assert.equal(summary.points[5].closed, 1);
  assert.equal(summary.highSeverityShare, 67);
  assert.equal(summary.closureRate, 33);
});

test('buildDashboardTrendSummary compara trimestre actual contra trimestre previo', () => {
  const summary = buildDashboardTrendSummary(
    [
      makeCausa({ id: '1', fechaApertura: '2026-03-01' }),
      makeCausa({ id: '2', fechaApertura: '2026-04-01' }),
      makeCausa({ id: '3', fechaApertura: '2026-06-01' }),
      makeCausa({ id: '4', fechaApertura: '2026-07-01' }),
      makeCausa({ id: '5', fechaApertura: '2026-08-01' }),
    ],
    new Date('2026-08-15T12:00:00Z'),
  );

  assert.equal(summary.previousOpened, 2);
  assert.equal(summary.currentOpened, 3);
  assert.equal(summary.openedDelta, 1);
  assert.equal(summary.busiestMonthTotal, 1);
});
