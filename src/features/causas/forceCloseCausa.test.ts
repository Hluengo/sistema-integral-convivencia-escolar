/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDraftCausa } from '../../lib/causaFactory';
import { EstadoCausa } from '../../types';
import { buildForceClosedCausa } from './forceCloseCausa';

describe('buildForceClosedCausa', () => {
  it('cierra sin eliminar la investigación y registra responsable, fundamento e informe', () => {
    const causa = createDraftCausa({
      counter: 8,
      estudianteNombre: 'ESTUDIANTE DE PRUEBA',
      estudianteCurso: '7° Básico B',
      runEstudiante: '11.111.111-1',
      tipoInfraccion: 'Grave',
      comprometeAulaSegura: false,
      observaciones: 'Antecedentes originales',
      responsable: 'Equipo de convivencia',
    });
    causa.bitacora = [
      {
        id: 'investigacion-1',
        fecha: '2026-07-28T14:00:00Z',
        tipo: 'Evidencia',
        titulo: 'Inspección del lugar',
        descripcion: 'Se revisaron los antecedentes.',
        participantes: ['Investigador'],
      },
    ];

    const resultado = buildForceClosedCausa(
      causa,
      {
        responsable: '  Jimena Chávez  ',
        titulo: '  Cierre por accidente acreditado  ',
        motivo: '  La investigación determinó que el hecho correspondió a un accidente.  ',
        documentoAdjunto: 'DC-2026-008/documentos/informe.pdf',
      },
      {
        entryId: 'cierre-1',
        fecha: '2026-07-30T16:00:00Z',
        fechaCivil: '2026-07-30',
      },
    );

    assert.equal(resultado.estadoActual, EstadoCausa.CAUSA_CERRADA);
    assert.equal(resultado.fechaUltimaActualizacion, '2026-07-30');
    assert.equal(resultado.bitacora.length, 2);
    assert.equal(resultado.bitacora[0].titulo, 'Cierre por accidente acreditado');
    assert.deepEqual(resultado.bitacora[0].participantes, ['Jimena Chávez']);
    assert.match(resultado.bitacora[0].descripcion, /Responsable del cierre: Jimena Chávez/);
    assert.match(resultado.bitacora[0].descripcion, /correspondió a un accidente/);
    assert.equal(resultado.bitacora[0].documentoAdjunto, 'DC-2026-008/documentos/informe.pdf');
    assert.equal(resultado.bitacora[1].id, 'investigacion-1');
    assert.equal(resultado.observaciones, 'Antecedentes originales');
  });
});
