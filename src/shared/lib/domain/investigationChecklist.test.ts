/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getBaseChecklist } from '../data';
import { EstadoCausa, type Causa } from '../types';
import {
  getApplicableInvestigationItemIds,
  getInvestigationChecklistModel,
  isMediationActive,
} from './investigationChecklist';

const completedChecklist = (completedIds: string[]) =>
  getBaseChecklist().map((item) =>
    completedIds.includes(item.id)
      ? {
          ...item,
          completado: true,
          fechaCompletado: '2026-08-10',
          registradoPor: 'Responsable',
        }
      : item,
  );

const causa = (overrides: Partial<Causa> = {}): Causa => ({
  id: 'DC-2026-014',
  estudianteNombre: 'Nombre completo',
  estudianteCurso: '7° Básico A',
  nnaProtectedName: 'N. C.',
  runEstudiante: '12.345.678-9',
  fechaApertura: '2026-07-01',
  estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
  tipoInfraccion: 'Grave',
  responsable: 'Responsable',
  comprometeAulaSegura: false,
  fechaUltimaActualizacion: '2026-07-01',
  observaciones: 'Resumen',
  bitacora: [],
  checklistDebidoProceso: completedChecklist([]),
  ...overrides,
});

describe('investigationChecklist domain', () => {
  it('calcula investigación sin mediación como 2/2 cuando ambos hitos base están completos', () => {
    const model = getInvestigationChecklistModel(
      causa({ checklistDebidoProceso: completedChecklist(['chk_inv_1', 'chk_inv_2']) }),
    );

    assert.equal(model.mediationActive, false);
    assert.equal(model.progress.total, 2);
    assert.equal(model.progress.completed, 2);
    assert.deepEqual(
      model.applicableItems.map((item) => item.id),
      ['chk_inv_1', 'chk_inv_2'],
    );
  });

  it('activa mediación cuando chk_inv_3 tiene evidencia persistida', () => {
    const model = getInvestigationChecklistModel(
      causa({ checklistDebidoProceso: completedChecklist(['chk_inv_3']) }),
    );

    assert.equal(model.mediationActive, true);
    assert.equal(model.progress.total, 2);
    assert.equal(model.progress.completed, 0);
    assert.equal(model.nextItem?.id, 'chk_inv_1');
    assert.equal(
      isMediationActive(causa({ checklistDebidoProceso: completedChecklist(['chk_inv_3']) })),
      true,
    );
  });

  it('no bloquea el avance cuando la mediación activa deja pendientes sus hitos alternativos', () => {
    const model = getInvestigationChecklistModel(
      causa({
        checklistDebidoProceso: completedChecklist(['chk_inv_1', 'chk_inv_2', 'chk_inv_3']),
      }),
    );

    assert.equal(model.mediationActive, true);
    assert.deepEqual(model.progress, { total: 2, completed: 2 });
    assert.equal(model.nextItem, null);
  });

  it('trata chk_inv_5 como salida con acuerdo y deja chk_inv_6 fuera de lo aplicable', () => {
    const itemIds = getApplicableInvestigationItemIds(
      causa({
        checklistDebidoProceso: completedChecklist(['chk_inv_3', 'chk_inv_4', 'chk_inv_5']),
      }),
    );

    assert.ok(itemIds.includes('chk_inv_5'));
    assert.equal(itemIds.includes('chk_inv_6'), false);
  });

  it('trata chk_inv_6 como salida sin acuerdo y deja chk_inv_5 fuera de lo aplicable', () => {
    const itemIds = getApplicableInvestigationItemIds(
      causa({
        checklistDebidoProceso: completedChecklist(['chk_inv_3', 'chk_inv_4', 'chk_inv_6']),
      }),
    );

    assert.ok(itemIds.includes('chk_inv_6'));
    assert.equal(itemIds.includes('chk_inv_5'), false);
  });

  it('reconoce expedientes legacy en estado de mediación aunque falten registros modernos', () => {
    const legacy = causa({
      estadoActual: EstadoCausa.MEDIACION_EN_DESARROLLO,
      checklistDebidoProceso: completedChecklist([]),
    });

    assert.equal(isMediationActive(legacy), true);
    assert.equal(getInvestigationChecklistModel(legacy).mediationActive, true);
  });

  it('reconoce bitácora histórica de mediación como evidencia persistida', () => {
    const historical = causa({
      bitacora: [
        {
          id: 'bit-mediacion',
          fecha: '2026-08-10T12:00:00Z',
          tipo: 'Mediación',
          titulo: 'Acuerdos de mediación',
          descripcion: 'Se registra avance de la instancia restaurativa.',
          participantes: ['Responsable'],
        },
      ],
    });

    assert.equal(isMediationActive(historical), true);
  });
});
