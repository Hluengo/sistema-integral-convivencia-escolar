/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EstadoCausa, type Causa } from '../../../shared/lib/types';
import { buildNotifications } from './useNotifications';

const baseCausa = (): Causa => ({
  id: 'DC-2026-001',
  estudianteNombre: 'Estudiante',
  estudianteCurso: '7° Básico B',
  nnaProtectedName: 'E.',
  runEstudiante: '1-9',
  fechaApertura: '2026-05-01',
  estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
  tipoInfraccion: 'Grave',
  responsable: 'Responsable',
  comprometeAulaSegura: false,
  fechaUltimaActualizacion: '2026-05-01',
  observaciones: '',
  bitacora: [],
  checklistDebidoProceso: [],
});

describe('buildNotifications', () => {
  it('genera alertas estables y accionables para un expediente', () => {
    const notifications = buildNotifications([baseCausa()], new Date('2026-07-30T12:00:00Z'));

    assert.ok(notifications.length > 0);
    assert.equal(notifications[0].causaId, 'DC-2026-001');
    assert.match(notifications[0].id, /^DC-2026-001:/);
  });

  it('no notifica causas cerradas', () => {
    const causa = { ...baseCausa(), estadoActual: EstadoCausa.CAUSA_CERRADA };
    assert.deepEqual(buildNotifications([causa], new Date('2026-07-30T12:00:00Z')), []);
  });
});
