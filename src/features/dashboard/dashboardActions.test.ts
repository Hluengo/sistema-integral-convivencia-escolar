/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EstadoCausa, type Causa } from '../../shared/lib/types';
import { getDashboardActions } from './dashboardActions';

const causa = (overrides: Partial<Causa> = {}): Causa => ({
  id: 'DC-2026-001',
  estudianteNombre: 'Nombre',
  estudianteCurso: '7° Básico A',
  nnaProtectedName: 'N. P.',
  runEstudiante: '1-9',
  fechaApertura: '2026-08-10',
  estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
  tipoInfraccion: 'Grave',
  responsable: 'Responsable',
  comprometeAulaSegura: false,
  fechaUltimaActualizacion: '2026-08-10',
  observaciones: '',
  bitacora: [],
  checklistDebidoProceso: [],
  ...overrides,
});

describe('getDashboardActions', () => {
  it('prioriza vencidos y próximos a vencer, excluyendo cerrados', () => {
    const actions = getDashboardActions(
      [
        causa({ id: 'overdue', fechaApertura: '2026-05-01' }),
        causa({ id: 'critical', fechaApertura: '2026-08-04', comprometeAulaSegura: true }),
        causa({ id: 'closed', estadoActual: EstadoCausa.CAUSA_CERRADA }),
      ],
      new Date('2026-08-15T12:00:00Z'),
    );

    assert.deepEqual(
      actions.map(({ causa: item }) => item.id),
      ['overdue', 'critical'],
    );
    assert.equal(actions[0]?.urgency, 'overdue');
    assert.equal(actions[1]?.urgency, 'critical');
  });
});
