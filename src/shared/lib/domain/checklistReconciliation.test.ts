/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BitacoraEntry } from '../types';
import { reconcileChecklistFromBitacora } from './checklistReconciliation';

const entry = (id: string, fecha: string, titulo: string, descripcion: string): BitacoraEntry => ({
  id,
  fecha,
  titulo,
  descripcion,
  tipo: 'Notificación',
  participantes: ['Jimena Chavez'],
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
});
