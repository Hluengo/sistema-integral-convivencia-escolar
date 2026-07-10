import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Causa } from '../types';
import { createCausa, fetchCausas, saveBitacora, saveChecklist, updateCausa } from '../lib/supabase';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseCausasPersistenceArgs {
  causas: Causa[];
  setCausas: Dispatch<SetStateAction<Causa[]>>;
  setSelectedCausaId: (id: string) => void;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
}

export function useCausasPersistence({
  causas,
  setCausas,
  setSelectedCausaId,
  setSaveStatus,
}: UseCausasPersistenceArgs) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLoadingCausasRef = useRef(true);
  const saveGenerationRef = useRef(0);
  const dataInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const prevCausasMapRef = useRef<Map<string, string>>(new Map());
  const pendingSaveRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadCausas = useCallback(async (retryCount = 0) => {
    isLoadingCausasRef.current = true;
    setLoadError(null);
    try {
      const loaded = await fetchCausas();
      if (!isMountedRef.current) return;
      setCausas(loaded);
      const newMap = new Map<string, string>();
      loaded.forEach(c => newMap.set(c.id, JSON.stringify(c)));
      prevCausasMapRef.current = newMap;
      if (loaded.length > 0) {
        setSelectedCausaId(loaded[0].id);
      }
    } catch (error) {
      console.error('Error loading causas:', error);
      if (!isMountedRef.current) return;
      if (retryCount < 2) {
        setTimeout(() => loadCausas(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        setLoadError('Error al cargar los expedientes. Verifique su conexión.');
        setCausas([]);
        setSelectedCausaId('');
      }
    } finally {
      isLoadingCausasRef.current = false;
    }
  }, [setCausas, setSelectedCausaId]);

  useEffect(() => {
    if (dataInitializedRef.current) return;
    dataInitializedRef.current = true;
    loadCausas();
  }, [loadCausas]);

  useEffect(() => {
    if (causas.length === 0 || isLoadingCausasRef.current) return;

    const changedIds: string[] = [];
    const currentMap = new Map<string, string>();

    for (const causa of causas) {
      const serialized = JSON.stringify(causa);
      currentMap.set(causa.id, serialized);
      const prev = prevCausasMapRef.current.get(causa.id);
      if (prev !== serialized) {
        changedIds.push(causa.id);
      }
    }

    prevCausasMapRef.current = currentMap;

    if (changedIds.length === 0) return;

    changedIds.forEach(id => pendingSaveRef.current.add(id));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = undefined;
    }
    if (saveIdleTimeoutRef.current) {
      clearTimeout(saveIdleTimeoutRef.current);
      saveIdleTimeoutRef.current = undefined;
    }

    const generation = ++saveGenerationRef.current;

    saveTimeoutRef.current = setTimeout(async () => {
      if (generation !== saveGenerationRef.current) return;

      const idsToSave = new Set(pendingSaveRef.current);
      pendingSaveRef.current.clear();

      if (idsToSave.size === 0) return;

      setSaveStatus('saving');

      try {
        const causasToSave = causas.filter(c => idsToSave.has(c.id));

        const results = await Promise.all(causasToSave.map(async (causa) => {
          const originalId = causa.id;
          const success = await updateCausa(causa);
          let effectiveId = originalId;
          if (!success) {
            const createdId = await createCausa(causa);
            if (!createdId) {
              console.error(`Failed to save causa ${originalId}`);
              return false;
            }
            effectiveId = createdId;
            setCausas(prev => prev.map(c => c.id === originalId ? { ...c, id: createdId } : c));
          }
          await Promise.all([
            saveBitacora(effectiveId, causa.bitacora),
            saveChecklist(effectiveId, causa.checklistDebidoProceso),
          ]);
          return true;
        }));

        if (!isMountedRef.current) return;

        if (results.some(result => !result)) {
          setSaveStatus('error');
          return;
        }

        setSaveStatus('saved');
        saveIdleTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [causas]);

  return { loadError, retryLoad: () => loadCausas() };
}
