/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EstadoCausa, type Causa } from '../../../types';
import { mergeCausasList } from './causasQueryCache';
import { causasQueryKeys } from './causasQueryKeys';

function createCausa(overrides: Partial<Causa> = {}): Causa {
  return {
    id: 'DC-2026-001',
    estudianteNombre: 'N. N.',
    estudianteCurso: '7° Básico A',
    nnaProtectedName: 'N. N.',
    runEstudiante: '',
    fechaApertura: '2026-07-30',
    estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
    tipoInfraccion: 'Grave',
    responsable: 'Encargado',
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: '2026-07-30T12:00:00.000Z',
    observaciones: '',
    bitacora: [],
    checklistDebidoProceso: [],
    ...overrides,
  };
}

describe('causasQueryCache', () => {
  it('separa la caché de causas por tenant y por detalle', () => {
    assert.deepEqual(causasQueryKeys.list('tenant-a'), ['causas', 'tenant-a', 'list', 'cursor']);
    assert.deepEqual(causasQueryKeys.details('tenant-a', 'DC-2026-001'), [
      'causas',
      'tenant-a',
      'details',
      'DC-2026-001',
    ]);
  });

  it('conserva los antecedentes ya cargados al refrescar sólo el listado', () => {
    const hydrated = createCausa({
      bitacora: [
        {
          id: 'historial-1',
          fecha: '2026-07-30T12:00:00.000Z',
          tipo: 'Otro',
          titulo: 'Antecedente',
          descripcion: 'Descripción',
          participantes: [],
        },
      ],
    });
    const freshList = [createCausa({ responsable: 'Nueva responsable' })];

    const merged = mergeCausasList([hydrated], freshList);

    assert.equal(merged[0].responsable, 'Nueva responsable');
    assert.equal(merged[0].bitacora.length, 1);
    assert.equal(merged[0].bitacora[0].id, 'historial-1');
  });
});
