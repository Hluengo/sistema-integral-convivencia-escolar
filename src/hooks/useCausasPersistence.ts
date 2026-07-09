import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
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
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLoadingCausasRef = useRef(true);
  const saveGenerationRef = useRef(0);
  const dataInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (dataInitializedRef.current) return;
    dataInitializedRef.current = true;

    async function loadCausas() {
      isLoadingCausasRef.current = true;
      try {
        const loaded = await fetchCausas();
        if (!isMountedRef.current) return;
        setCausas(loaded);
        if (loaded.length > 0) {
          setSelectedCausaId(loaded[0].id);
        }
      } catch (error) {
        console.error('Error loading causas:', error);
        if (!isMountedRef.current) return;
        setCausas([]);
        setSelectedCausaId('');
      } finally {
        isLoadingCausasRef.current = false;
      }
    }

    loadCausas();
  }, [setCausas, setSelectedCausaId]);

  useEffect(() => {
    if (causas.length === 0 || isLoadingCausasRef.current) return;

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
      setSaveStatus('saving');

      try {
        const results = await Promise.all(causas.map(async (causa) => {
          const success = await updateCausa(causa);
          let effectiveId = causa.id;
          if (!success) {
            const createdId = await createCausa(causa);
            if (!createdId) {
              console.error(`Failed to save causa ${causa.id}`);
              return false;
            }
            effectiveId = createdId;
            setCausas(prev => prev.map(c => c.id === causa.id ? { ...c, id: createdId } : c));
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
  }, [causas, setSaveStatus]);
}
