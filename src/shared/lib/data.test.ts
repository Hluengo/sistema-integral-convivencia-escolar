/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getBaseChecklist, getPhaseProgress } from './data';
import { EstadoCausa, type Causa } from './types';

const completedChecklist = (completedIds: string[]) =>
  getBaseChecklist().map((item) => ({
    ...item,
    completado: completedIds.includes(item.id),
    fechaCompletado: completedIds.includes(item.id) ? '2026-08-10' : undefined,
  }));

const causa = (completedIds: string[], overrides: Partial<Causa> = {}): Causa => ({
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
  checklistDebidoProceso: completedChecklist(completedIds),
  ...overrides,
});

describe('getPhaseProgress', () => {
  it('calcula Investigación sin mediación como 2/2 y no como 2/6', () => {
    const progress = getPhaseProgress(causa(['chk_inv_1', 'chk_inv_2']), 'Investigación');

    assert.equal(progress.completed, 2);
    assert.equal(progress.total, 2);
  });

  it('cuenta una sola salida de mediación cuando hay acuerdo', () => {
    const progress = getPhaseProgress(
      causa(['chk_inv_1', 'chk_inv_2', 'chk_inv_3', 'chk_inv_4', 'chk_inv_5']),
      'Investigación',
    );

    assert.equal(progress.completed, 5);
    assert.equal(progress.total, 5);
  });

  it('cuenta una sola salida de mediación cuando fracasa y retorna a investigación', () => {
    const progress = getPhaseProgress(
      causa(['chk_inv_1', 'chk_inv_2', 'chk_inv_3', 'chk_inv_4', 'chk_inv_6']),
      'Investigación',
    );

    assert.equal(progress.completed, 5);
    assert.equal(progress.total, 5);
  });

  it('cuenta solo actuaciones visibles desde Resolución en adelante', () => {
    const progress = getPhaseProgress(causa(['chk_res_1', 'chk_res_2']), 'Resolución');

    assert.equal(progress.completed, 1);
    assert.equal(progress.total, 3);
  });

  it('mantiene 4 hitos de apelación y 3 de seguimiento', () => {
    const checklist = causa([
      'chk_imp_1',
      'chk_imp_2',
      'chk_imp_3',
      'chk_imp_4',
      'chk_imp_5',
      'chk_seg_1',
      'chk_seg_2',
      'chk_seg_3',
      'chk_seg_4',
    ]);

    assert.equal(getPhaseProgress(checklist, 'Apelación').total, 4);
    assert.equal(getPhaseProgress(checklist, 'Seguimiento').total, 3);
  });
});
