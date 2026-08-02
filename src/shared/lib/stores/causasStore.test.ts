/** @license SPDX-License-Identifier: Apache-2.0 */

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type * as CausasStoreExports from './causasStore';
import { EstadoCausa, type Causa } from '../types';

type CausasStoreModule = typeof CausasStoreExports;

let storeModule: CausasStoreModule | null = null;

async function loadStoreModule(): Promise<CausasStoreModule> {
  process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY ??= 'public-anon-key-for-tests';
  storeModule ??= await import('./causasStore');
  return storeModule;
}

function makeCausa(overrides: Partial<Causa> = {}): Causa {
  return {
    id: 'DC-2026-001',
    estudianteNombre: 'Estudiante Demo',
    estudianteCurso: '1A',
    nnaProtectedName: 'E.D.',
    runEstudiante: '12.345.678-9',
    fechaApertura: '2026-08-01',
    estadoActual: EstadoCausa.DENUNCIA_RECEPCIONADA,
    tipoInfraccion: 'Grave',
    responsable: 'Convivencia Escolar',
    comprometeAulaSegura: false,
    fechaUltimaActualizacion: '2026-08-01',
    observaciones: 'Registro inicial',
    bitacora: [],
    checklistDebidoProceso: [],
    ...overrides,
  };
}

afterEach(() => {
  const store = storeModule?.useCausasStore;
  if (!store) return;
  store.setState({
    causas: [],
    selectedCausaId: '',
    saveStatus: 'idle',
    selectedFaseFilter: 'Todas',
    searchQuery: '',
  });
});

describe('causasStore', () => {
  it('actualiza filtros, selección y estado de guardado', async () => {
    const { useCausasStore } = await loadStoreModule();
    const causa = makeCausa();

    useCausasStore.getState().setCausas([causa]);
    useCausasStore.getState().setSelectedCausaId(causa.id);
    useCausasStore.getState().setSaveStatus('saving');
    useCausasStore.getState().setSelectedFaseFilter('Investigación');
    useCausasStore.getState().setSearchQuery('demo');

    const state = useCausasStore.getState();
    assert.deepEqual(state.causas, [causa]);
    assert.equal(state.selectedCausaId, causa.id);
    assert.equal(state.saveStatus, 'saving');
    assert.equal(state.selectedFaseFilter, 'Investigación');
    assert.equal(state.searchQuery, 'demo');
  });

  it('clasifica causas activas, cerradas y Aula Segura', async () => {
    const { selectActiveCausas, selectAulaSeguraCausas, selectClosedCausas } =
      await loadStoreModule();
    const active = makeCausa({ id: 'DC-2026-001' });
    const closed = makeCausa({
      id: 'DC-2026-002',
      estadoActual: EstadoCausa.CAUSA_CERRADA,
      comprometeAulaSegura: true,
    });
    const aulaSegura = makeCausa({
      id: 'DC-2026-003',
      estadoActual: EstadoCausa.EN_PROCESO_INDAGACION,
      comprometeAulaSegura: true,
    });
    const state = { causas: [active, closed, aulaSegura] };

    assert.deepEqual(
      selectActiveCausas(state).map((causa) => causa.id),
      ['DC-2026-001', 'DC-2026-003'],
    );
    assert.deepEqual(
      selectClosedCausas(state).map((causa) => causa.id),
      ['DC-2026-002'],
    );
    assert.deepEqual(
      selectAulaSeguraCausas(state).map((causa) => causa.id),
      ['DC-2026-003'],
    );
  });

  it('reabre una causa cerrada sin borrar sus antecedentes', async () => {
    const { useCausasStore } = await loadStoreModule();
    const closed = makeCausa({
      estadoActual: EstadoCausa.CAUSA_CERRADA,
      bitacora: [
        {
          id: 'bit-1',
          fecha: '2026-08-01',
          tipo: 'Resolución',
          titulo: 'Cierre',
          descripcion: 'Causa cerrada',
          participantes: [],
        },
      ],
    });

    useCausasStore.getState().setCausas([closed]);
    useCausasStore.getState().handleReopenCausa(closed);

    const reopened = useCausasStore.getState().causas[0];
    assert.equal(reopened.estadoActual, EstadoCausa.PROCESO_SEGUIMIENTO);
    assert.equal(useCausasStore.getState().selectedCausaId, closed.id);
    assert.deepEqual(reopened.bitacora, closed.bitacora);
  });
});
