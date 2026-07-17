/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Dispatch, SetStateAction } from 'react';
import { create } from 'zustand';
import type { Causa, FaseProcedimental } from '../../../types';
import { EstadoCausa } from '../../../types';
import { getFaseForEstado } from '../../../data';
import { createCausa, deleteCausa } from '../../../services/cases/causas.service';
import { createDraftCausa } from '../../../lib/causaFactory';
import { nowDateOnly } from '../../../lib/dateUtils';
import { useToastStore } from './toastStore';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface CausasState {
  causas: Causa[];
  selectedCausaId: string;
  saveStatus: SaveStatus;
  selectedFaseFilter: FaseProcedimental | 'Todas';
  searchQuery: string;

  setCausas: Dispatch<SetStateAction<Causa[]>>;
  setSelectedCausaId: (id: string) => void;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  setSelectedFaseFilter: (filter: FaseProcedimental | 'Todas') => void;
  setSearchQuery: (query: string) => void;

  handleCreateCausa: (params: {
    newEstNombre: string;
    newEstRut: string;
    newEstCurso: string;
    newInfTipo: Causa['tipoInfraccion'];
    newAulaSegura: boolean;
    newObs: string;
    newResponsable: string;
  }) => Promise<string | false>;
  handleDeleteCausa: (id: string, requireAuth: () => boolean) => Promise<void>;
  handleUpdateCausa: (updated: Causa) => void;
  handleReopenCausa: (causa: Causa) => void;
}

export const useCausasStore = create<CausasState>((set, get) => ({
  causas: [],
  selectedCausaId: '',
  saveStatus: 'idle',
  selectedFaseFilter: 'Todas',
  searchQuery: '',

  setCausas: (causas) => set((state) => ({
    causas: typeof causas === 'function' ? (causas as (prev: Causa[]) => Causa[])(state.causas) : causas,
  })),
  setSelectedCausaId: (id) => set({ selectedCausaId: id }),
  setSaveStatus: (status) => set((state) => ({
    saveStatus: typeof status === 'function' ? (status as (prev: SaveStatus) => SaveStatus)(state.saveStatus) : status,
  })),
  setSelectedFaseFilter: (filter) => set({ selectedFaseFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  handleCreateCausa: async (params) => {
    const state = get();
    const nextCounter = state.causas.length > 0
      ? Math.max(...state.causas.map((c) => Number.parseInt(c.id.split('-')[2], 10) || 0)) + 1
      : 1;
    const newObj = createDraftCausa({
      counter: nextCounter,
      estudianteNombre: params.newEstNombre,
      estudianteCurso: params.newEstCurso,
      runEstudiante: params.newEstRut,
      tipoInfraccion: params.newInfTipo,
      comprometeAulaSegura: params.newAulaSegura,
      observaciones: params.newObs,
      responsable: params.newResponsable,
    });
    const result = await createCausa(newObj);
    if (result) {
      set((prev) => ({
        causas: [{ ...newObj, id: result }, ...prev.causas],
        selectedCausaId: result,
      }));
      useToastStore.getState().addToast('success', `Caso ${result} creado exitosamente`);
    } else {
      useToastStore.getState().addToast('error', 'Error al crear el caso');
    }
    return result;
  },

  handleDeleteCausa: async (id, requireAuth) => {
    if (!requireAuth()) return;
    const ok = await deleteCausa(id);
    if (!ok) {
      useToastStore.getState().addToast('error', 'Error al eliminar el caso');
      return;
    }
    set((state) => {
      const nextCausas = state.causas.filter((c) => c.id !== id);
      return {
        causas: nextCausas,
        selectedCausaId: state.selectedCausaId === id ? (nextCausas[0]?.id || '') : state.selectedCausaId,
      };
    });
    useToastStore.getState().addToast('success', `Caso ${id} eliminado`);
  },

  handleUpdateCausa: (updated) => set((state) => ({
    causas: state.causas.map((c) => (c.id === updated.id ? updated : c)),
  })),

  handleReopenCausa: (causa) => set((state) => {
    const updated: Causa = {
      ...causa,
      estadoActual: EstadoCausa.PROCESO_SEGUIMIENTO,
      fechaUltimaActualizacion: nowDateOnly(),
    };
    return {
      causas: state.causas.map((c) => (c.id === updated.id ? updated : c)),
      selectedCausaId: causa.id,
    };
  }),
}));

// Selectors (derived data — pure functions)
export function selectActiveCausas(state: CausasState) {
  return state.causas.filter((c) => c.estadoActual !== EstadoCausa.CAUSA_CERRADA);
}

export function selectClosedCausas(state: CausasState) {
  return state.causas.filter((c) => c.estadoActual === EstadoCausa.CAUSA_CERRADA);
}

export function selectAulaSeguraCausas(state: CausasState) {
  return state.causas.filter((c) => c.comprometeAulaSegura && c.estadoActual !== EstadoCausa.CAUSA_CERRADA);
}

export function selectFilteredCausas(state: CausasState) {
  const active = selectActiveCausas(state);
  return active.filter((c) => {
    if (state.selectedFaseFilter !== 'Todas') {
      if (getFaseForEstado(c.estadoActual) !== state.selectedFaseFilter) return false;
    }
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      if (!c.estudianteNombre.toLowerCase().includes(q) &&
          !c.nnaProtectedName.toLowerCase().includes(q) &&
          !c.id.toLowerCase().includes(q) &&
          !c.estudianteCurso.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function selectSelectedCausa(state: CausasState) {
  return state.causas.find((c) => c.id === state.selectedCausaId) || null;
}
