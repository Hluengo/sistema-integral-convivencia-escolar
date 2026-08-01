/** @license SPDX-License-Identifier: Apache-2.0 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { EstadoCausa, type Causa } from '../../types';
import { filterReportCausas } from './reportUtils';

const causa = (overrides: Partial<Causa> = {}): Causa => ({
  id: 'DC-2026-001',
  estudianteNombre: 'Estudiante',
  estudianteCurso: '7°A',
  nnaProtectedName: 'E.',
  runEstudiante: '1-9',
  fechaApertura: '2026-07-10',
  estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
  tipoInfraccion: 'Grave',
  responsable: 'Inspectoría',
  comprometeAulaSegura: false,
  fechaUltimaActualizacion: '2026-07-11',
  observaciones: '',
  bitacora: [],
  checklistDebidoProceso: [],
  ...overrides,
});

test('reportUtils filtra por curso, fechas, estado y responsable', () => {
  const rows = [
    causa(),
    causa({ id: 'DC-2026-002', estudianteCurso: '8°B', fechaApertura: '2026-08-01' }),
  ];
  assert.equal(
    filterReportCausas(rows, {
      course: '7°A',
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
      status: EstadoCausa.EN_PROCESO_INDAGACION,
      responsible: 'Inspectoría',
    }).length,
    1,
  );
});
