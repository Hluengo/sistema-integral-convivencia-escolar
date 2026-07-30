/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDraftCausa } from '@/src/lib/causaFactory';
import { persistExistingCausa, type ExistingCausaPersistenceOperations } from './causaPersistence';

const allChanges = { causa: true, bitacora: true, checklist: true } as const;

function createCausaFixture() {
  return createDraftCausa({
    counter: 1,
    estudianteNombre: 'ESTUDIANTE DE PRUEBA',
    estudianteCurso: '1° Medio A',
    runEstudiante: '11.111.111-1',
    tipoInfraccion: 'Leve',
    comprometeAulaSegura: false,
    observaciones: '',
    responsable: 'Inspectoría',
  });
}

describe('persistExistingCausa', () => {
  it('no guarda datos relacionados cuando falla la actualización', async () => {
    const calls: string[] = [];
    const operations: ExistingCausaPersistenceOperations = {
      updateCausa: async () => {
        calls.push('update');
        return false;
      },
      saveBitacora: async () => {
        calls.push('bitacora');
        return true;
      },
      saveChecklist: async () => {
        calls.push('checklist');
        return true;
      },
    };

    const causa = createCausaFixture();
    assert.equal(await persistExistingCausa(causa, causa, allChanges, operations), false);
    assert.deepEqual(calls, ['update']);
  });

  it('guarda bitácora y checklist después de actualizar el expediente', async () => {
    const calls: string[] = [];
    const operations: ExistingCausaPersistenceOperations = {
      updateCausa: async () => {
        calls.push('update');
        return true;
      },
      saveBitacora: async () => {
        calls.push('bitacora');
        return true;
      },
      saveChecklist: async () => {
        calls.push('checklist');
        return true;
      },
    };

    const causa = createCausaFixture();
    assert.equal(await persistExistingCausa(causa, causa, allChanges, operations), true);
    assert.equal(calls[0], 'update');
    assert.deepEqual(new Set(calls.slice(1)), new Set(['bitacora', 'checklist']));
  });

  it('reporta error si falla una colección relacionada', async () => {
    const operations: ExistingCausaPersistenceOperations = {
      updateCausa: async () => true,
      saveBitacora: async () => false,
      saveChecklist: async () => true,
    };

    const causa = createCausaFixture();
    assert.equal(await persistExistingCausa(causa, causa, allChanges, operations), false);
  });

  it('persiste solo la colección que cambió', async () => {
    const calls: string[] = [];
    const operations: ExistingCausaPersistenceOperations = {
      updateCausa: async () => {
        calls.push('causa');
        return true;
      },
      saveBitacora: async () => {
        calls.push('bitacora');
        return true;
      },
      saveChecklist: async () => {
        calls.push('checklist');
        return true;
      },
    };
    const causa = createCausaFixture();

    assert.equal(
      await persistExistingCausa(
        causa,
        causa,
        { causa: false, bitacora: true, checklist: false },
        operations,
      ),
      true,
    );
    assert.deepEqual(calls, ['bitacora']);
  });
});
