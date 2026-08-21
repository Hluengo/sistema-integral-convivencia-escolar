/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPhaseProgress } from '../data';
import { EstadoCausa, type BitacoraEntry, type Causa } from '../types';
import { isMediationActive } from './investigationChecklist';
import { reconcileChecklistFromBitacora } from './checklistReconciliation';

const entry = (id: string, fecha: string, titulo: string, descripcion: string): BitacoraEntry => ({
  id,
  fecha,
  titulo,
  descripcion,
  tipo: 'Notificación',
  participantes: ['Jimena Chavez'],
});

const causa = (
  checklistDebidoProceso: Causa['checklistDebidoProceso'],
  bitacora: BitacoraEntry[] = [],
  overrides: Partial<Causa> = {},
): Causa => ({
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
  bitacora,
  checklistDebidoProceso,
  ...overrides,
});

describe('reconcileChecklistFromBitacora', () => {
  it('recupera hitos faltantes respetando la fecha chilena', () => {
    const result = reconcileChecklistFromBitacora(
      [],
      [
        entry(
          'b1',
          '2026-07-30T03:24:38.096Z',
          'Registro de Hito: Recepción de Denuncia',
          'Registro. Responsable: Jimena Chavez. Observaciones: Denuncia recibida.',
        ),
      ],
    );
    const item = result.find((candidate) => candidate.id === 'chk_rec_1');

    assert.equal(item?.completado, true);
    assert.equal(item?.fechaCompletado, '2026-07-29');
    assert.equal(item?.registradoPor, 'Jimena Chavez');
    assert.equal(item?.observaciones, 'Denuncia recibida.');
  });

  it('aplica cronológicamente anulaciones y nuevos registros', () => {
    const result = reconcileChecklistFromBitacora(
      [],
      [
        entry(
          'b3',
          '2026-07-30T03:34:09.206Z',
          'Registro de Hito: Notificación de Inicio de Indagación',
          'Registro. Responsable: Jimena Chavez. Observaciones: Notificación corregida.',
        ),
        entry(
          'b2',
          '2026-07-30T03:33:45.711Z',
          'Invalidador Hito: Notificación de Inicio de Indagación',
          'Registro anulado.',
        ),
        entry(
          'b1',
          '2026-07-30T03:33:33.487Z',
          'Registro de Hito: Notificación de Inicio de Indagación',
          'Registro. Responsable: Jimena Chavez. Observaciones: Versión anterior.',
        ),
      ],
    );
    const item = result.find((candidate) => candidate.id === 'chk_rec_3');

    assert.equal(item?.completado, true);
    assert.equal(item?.observaciones, 'Notificación corregida.');
  });

  it('reconstruye una rectificación de hito después de recargar', () => {
    const result = reconcileChecklistFromBitacora(
      [],
      [
        entry(
          'b1',
          '2026-08-10T12:00:00.000Z',
          'Rectificación de Hito: Informe Concluyente Emitido',
          'Se rectificó el registro. Responsable: Jimena Chavez. Observaciones actualizadas: Resolución notificada correctamente.',
        ),
      ],
    );
    const item = result.find((candidate) => candidate.id === 'chk_res_6');

    assert.equal(item?.completado, true);
    assert.equal(item?.registradoPor, 'Jimena Chavez');
    assert.equal(item?.observaciones, 'Resolución notificada correctamente.');
  });

  it('mantiene todos los hitos base aunque Supabase tenga solo una parte', () => {
    const result = reconcileChecklistFromBitacora(
      [
        {
          id: 'chk_rec_1',
          label: 'Recepción de Denuncia',
          descripcion: 'Persistido',
          completado: true,
          requeridoPor: 'Circular 482',
        },
      ],
      [],
    );

    assert.ok(result.length > 1);
    assert.equal(result.find((candidate) => candidate.id === 'chk_rec_1')?.completado, true);
    assert.ok(result.some((candidate) => candidate.id === 'chk_rec_2'));
  });

  it('no convierte los hitos base de mediación en obligatorios para una causa sin mediación', () => {
    const result = reconcileChecklistFromBitacora(
      [],
      [
        entry(
          'b1',
          '2026-08-10T12:00:00.000Z',
          'Registro de Hito: En Proceso de Indagación',
          'Registro. Responsable: Jimena Chavez. Observaciones: Indagación iniciada.',
        ),
        entry(
          'b2',
          '2026-08-10T13:00:00.000Z',
          'Registro de Hito: Recopilación de Evidencias en Curso',
          'Registro. Responsable: Jimena Chavez. Observaciones: Evidencias recopiladas.',
        ),
      ],
    );
    const progress = getPhaseProgress(result, 'Investigación');

    assert.ok(result.some((candidate) => candidate.id === 'chk_inv_6'));
    assert.equal(progress.completed, 2);
    assert.equal(progress.total, 2);
  });

  it('reconoce una causa legacy con registros históricos de mediación', () => {
    const mediationEntry: BitacoraEntry = {
      ...entry(
        'b-mediacion',
        '2026-08-10T14:00:00.000Z',
        'Acuerdos de mediación',
        'Se registra una sesión restaurativa con compromisos.',
      ),
      tipo: 'Mediación',
    };
    const result = reconcileChecklistFromBitacora([], [mediationEntry]);
    const legacy = causa(result, [mediationEntry]);

    assert.equal(isMediationActive(legacy), true);
    assert.equal(getPhaseProgress(legacy, 'Investigación').total, 5);
  });
});
