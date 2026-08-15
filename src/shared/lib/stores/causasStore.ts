/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Dispatch, SetStateAction } from 'react';
import { create } from 'zustand';
import type { Causa, FaseProcedimental } from '../types';
import { EstadoCausa } from '../types';
import { createCausa, deleteCausa } from '../../api/services/causas.service';
import { createDraftCausa } from '../../../lib/causaFactory';
import { nowDateOnly } from '../../../shared/lib/dateUtils';
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';
import { addCausaToCache, removeCausaFromCache } from '../queries/causasQueryCache';

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
    studentId?: string;
    newEstNombre: string;
    newEstRut: string;
    newEstCurso: string;
    newInfTipo: Causa['tipoInfraccion'];
    newAulaSegura: boolean;
    newObs: string;
    newResponsable: string;
  }) => Promise<string | false>;
  handleDeleteCausa: (id: string, requireAuth: () => boolean) => Promise<boolean>;
  handleUpdateCausa: (updated: Causa) => void;
  handleReopenCausa: (causa: Causa) => void;
}

export const useCausasStore = create<CausasState>((set, get) => ({
  causas: [],
  selectedCausaId: '',
  saveStatus: 'idle',
  selectedFaseFilter: 'Todas',
  searchQuery: '',

  setCausas: (causas) =>
    set((state) => ({
      causas:
        typeof causas === 'function'
          ? (causas as (prev: Causa[]) => Causa[])(state.causas)
          : causas,
    })),
  setSelectedCausaId: (id) => set({ selectedCausaId: id }),
  setSaveStatus: (status) =>
    set((state) => ({
      saveStatus:
        typeof status === 'function'
          ? (status as (prev: SaveStatus) => SaveStatus)(state.saveStatus)
          : status,
    })),
  setSelectedFaseFilter: (filter) => set({ selectedFaseFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  handleCreateCausa: async (params) => {
    const state = get();
    // Reduce en lugar de Math.max(...spread): evita exceder el límite de
    // argumentos de una función con listas muy grandes de expedientes.
    const maxCounter = state.causas.reduce((max, causa) => {
      const n = Number.parseInt(causa.id.split('-')[2], 10) || 0;
      return n > max ? n : max;
    }, 0);
    const nextCounter = state.causas.length > 0 ? maxCounter + 1 : 1;
    const newObj = createDraftCausa({
      counter: nextCounter,
      studentId: params.studentId,
      estudianteNombre: params.newEstNombre,
      estudianteCurso: params.newEstCurso,
      runEstudiante: params.newEstRut,
      tipoInfraccion: params.newInfTipo,
      comprometeAulaSegura: params.newAulaSegura,
      observaciones: params.newObs,
      responsable: params.newResponsable,
    });
    const result = await createCausa(newObj, useAuthStore.getState().tenantId);
    if (result) {
      const createdCausa = { ...newObj, id: result };
      set((prev) => ({
        causas: [createdCausa, ...prev.causas],
        selectedCausaId: result,
      }));
      const tenantId = useAuthStore.getState().tenantId;
      if (tenantId) addCausaToCache(tenantId, createdCausa);
      useToastStore.getState().addToast('success', `Caso ${result} creado exitosamente`);
    } else {
      useToastStore.getState().addToast('error', 'Error al crear el caso');
    }
    return result;
  },

  handleDeleteCausa: async (id, requireAuth) => {
    if (!requireAuth()) return false;
    const ok = await deleteCausa(id);
    if (!ok) {
      useToastStore.getState().addToast('error', 'Error al eliminar el caso');
      return false;
    }
    const tenantId = useAuthStore.getState().tenantId;
    if (tenantId) removeCausaFromCache(tenantId, id);
    set((state) => {
      const nextCausas = state.causas.filter((c) => c.id !== id);
      return {
        causas: nextCausas,
        selectedCausaId: state.selectedCausaId === id ? '' : state.selectedCausaId,
      };
    });
    useToastStore.getState().addToast('success', `Caso ${id} eliminado`);
    return true;
  },

  handleUpdateCausa: (updated) =>
    set((state) => ({
      causas: state.causas.map((c) => (c.id === updated.id ? updated : c)),
    })),

  handleReopenCausa: (causa) =>
    set((state) => {
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
export function selectActiveCausas(state: Pick<CausasState, 'causas'>) {
  return state.causas.filter((c) => c.estadoActual !== EstadoCausa.CAUSA_CERRADA);
}

export function selectClosedCausas(state: Pick<CausasState, 'causas'>) {
  return state.causas.filter((c) => c.estadoActual === EstadoCausa.CAUSA_CERRADA);
}

export function selectAulaSeguraCausas(state: Pick<CausasState, 'causas'>) {
  return state.causas.filter(
    (c) => c.comprometeAulaSegura && c.estadoActual !== EstadoCausa.CAUSA_CERRADA,
  );
}
