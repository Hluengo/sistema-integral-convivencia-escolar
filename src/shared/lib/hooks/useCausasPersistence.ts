/** @license SPDX-License-Identifier: Apache-2.0 */

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef } from 'react';
import type { Causa } from '@/src/types';
import { saveBitacora, saveChecklist, updateCausa } from '@/src/services/cases';
import { persistExistingCausa, type CausaPersistenceChanges } from './causaPersistence';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseCausasPersistenceArgs {
  causas: Causa[];
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  isAuthenticated: boolean;
  onPersisted: (causas: Causa[]) => void;
}

/**
 * Autoguardado diferencial del estado local.
 *
 * La lectura se resuelve por React Query. Este hook no carga datos para evitar
 * waterfalls y se limita a persistir los bloques que realmente cambiaron.
 */
export function useCausasPersistence({
  causas,
  setSaveStatus,
  isAuthenticated,
  onPersisted,
}: UseCausasPersistenceArgs) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveGenerationRef = useRef(0);
  const isMountedRef = useRef(true);
  const prevCausasMapRef = useRef<Map<string, Causa>>(new Map());
  const pendingSaveRef = useRef<
    Map<string, { changes: CausaPersistenceChanges; previousCausa: Causa }>
  >(new Map());

  const markCausasHydrated = useCallback((hydratedCausas: Causa[]) => {
    prevCausasMapRef.current = new Map(hydratedCausas.map((causa) => [causa.id, causa]));
  }, []);

  const markCausaHydrated = useCallback((hydratedCausa: Causa) => {
    prevCausasMapRef.current.set(hydratedCausa.id, hydratedCausa);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (saveIdleTimeoutRef.current) clearTimeout(saveIdleTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      prevCausasMapRef.current.clear();
      pendingSaveRef.current.clear();
      return;
    }

    if (causas.length === 0) return;

    const currentMap = new Map<string, Causa>();

    for (const causa of causas) {
      currentMap.set(causa.id, causa);
      const prev = prevCausasMapRef.current.get(causa.id);
      const changes: CausaPersistenceChanges = prev
        ? {
            causa: serializeCausaCore(prev) !== serializeCausaCore(causa),
            bitacora: JSON.stringify(prev.bitacora) !== JSON.stringify(causa.bitacora),
            checklist:
              JSON.stringify(prev.checklistDebidoProceso) !==
              JSON.stringify(causa.checklistDebidoProceso),
          }
        : {
            // createCausa ya insertó el expediente principal. Solo falta
            // persistir sus colecciones iniciales, si las tiene.
            causa: false,
            bitacora: causa.bitacora.length > 0,
            checklist: causa.checklistDebidoProceso.length > 0,
          };

      if (changes.causa || changes.bitacora || changes.checklist) {
        const pending = pendingSaveRef.current.get(causa.id);
        pendingSaveRef.current.set(causa.id, {
          previousCausa: pending?.previousCausa ?? createInitialSnapshot(causa, prev),
          changes: {
            causa: pending?.changes.causa || changes.causa,
            bitacora: pending?.changes.bitacora || changes.bitacora,
            checklist: pending?.changes.checklist || changes.checklist,
          },
        });
      }
    }

    prevCausasMapRef.current = currentMap;

    if (pendingSaveRef.current.size === 0) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (saveIdleTimeoutRef.current) clearTimeout(saveIdleTimeoutRef.current);

    const generation = ++saveGenerationRef.current;
    saveTimeoutRef.current = setTimeout(async () => {
      if (generation !== saveGenerationRef.current) return;

      const pendingSaves = new Map(pendingSaveRef.current);
      pendingSaveRef.current.clear();
      if (pendingSaves.size === 0) return;

      setSaveStatus('saving');
      try {
        const causasToSave = causas.filter((causa) => pendingSaves.has(causa.id));
        const results = await Promise.all(
          causasToSave.map((causa) => {
            const pending = pendingSaves.get(causa.id);
            if (!pending) return true;
            return persistExistingCausa(causa, pending.previousCausa, pending.changes, {
              updateCausa,
              saveBitacora,
              saveChecklist,
            });
          }),
        );

        if (!isMountedRef.current) return;
        if (results.some((result) => !result)) {
          setSaveStatus('error');
          return;
        }

        onPersisted(causasToSave);
        setSaveStatus('saved');
        saveIdleTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus((previous) => (previous === 'saved' ? 'idle' : previous));
          }
        }, 2000);
      } catch (error) {
        if (!isMountedRef.current) return;
        console.error('Autosave failed:', error);
        setSaveStatus('error');
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = undefined;
      }
      if (saveIdleTimeoutRef.current) {
        clearTimeout(saveIdleTimeoutRef.current);
        saveIdleTimeoutRef.current = undefined;
      }
    };
  }, [causas, isAuthenticated, onPersisted, setSaveStatus]);

  return { markCausasHydrated, markCausaHydrated };
}

function serializeCausaCore(causa: Causa): string {
  const { bitacora: _bitacora, checklistDebidoProceso: _checklist, ...core } = causa;
  return JSON.stringify(core);
}

function createInitialSnapshot(causa: Causa, previousCausa: Causa | undefined): Causa {
  if (previousCausa) return previousCausa;
  return { ...causa, bitacora: [], checklistDebidoProceso: [] };
}
