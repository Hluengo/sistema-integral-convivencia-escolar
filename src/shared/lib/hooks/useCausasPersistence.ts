import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Causa } from '@/src/types';
import { fetchCausas, saveBitacora, saveChecklist, updateCausa } from '@/src/services/cases';
import { persistExistingCausa } from './causaPersistence';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseCausasPersistenceArgs {
  causas: Causa[];
  setCausas: Dispatch<SetStateAction<Causa[]>>;
  setSelectedCausaId: (id: string) => void;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  isAuthenticated: boolean;
}

export function useCausasPersistence({
  causas,
  setCausas,
  setSelectedCausaId,
  setSaveStatus,
  isAuthenticated,
}: UseCausasPersistenceArgs) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isLoadingCausasRef = useRef(false);
  const saveGenerationRef = useRef(0);
  const dataInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const prevCausasMapRef = useRef<Map<string, string>>(new Map());
  const pendingSaveRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (loadRetryTimeoutRef.current) {
        clearTimeout(loadRetryTimeoutRef.current);
      }
    };
  }, []);

  const loadCausas = useCallback(
    async (retryCount = 0) => {
      if (!isAuthenticated || isLoadingCausasRef.current) return;

      isLoadingCausasRef.current = true;
      setLoadError(null);
      try {
        const loaded = await fetchCausas();
        if (!isMountedRef.current) return;

        setCausas(loaded);
        const newMap = new Map<string, string>();
        for (const c of loaded) {
          newMap.set(c.id, JSON.stringify(c));
        }
        prevCausasMapRef.current = newMap;
        setSelectedCausaId(loaded[0]?.id || '');
      } catch (error) {
        console.error('Error loading causas:', error);
        if (!isMountedRef.current) return;

        if (retryCount < 2 && isAuthenticated) {
          loadRetryTimeoutRef.current = setTimeout(
            () => loadCausas(retryCount + 1),
            750 * (retryCount + 1),
          );
        } else {
          setLoadError('Error al cargar los expedientes. Verifique su conexión.');
        }
      } finally {
        isLoadingCausasRef.current = false;
      }
    },
    [isAuthenticated, setCausas, setSelectedCausaId],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      dataInitializedRef.current = false;
      prevCausasMapRef.current.clear();
      pendingSaveRef.current.clear();
      return;
    }

    if (dataInitializedRef.current) return;
    dataInitializedRef.current = true;
    void loadCausas();
  }, [isAuthenticated, loadCausas]);

  useEffect(() => {
    if (causas.length === 0 || isLoadingCausasRef.current) {
      return;
    }

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

    if (changedIds.length === 0 || !isAuthenticated) {
      return;
    }

    for (const id of changedIds) {
      pendingSaveRef.current.add(id);
    }

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
      if (generation !== saveGenerationRef.current) {
        return;
      }

      const idsToSave = new Set(pendingSaveRef.current);
      pendingSaveRef.current.clear();

      if (idsToSave.size === 0) {
        return;
      }

      setSaveStatus('saving');

      try {
        const causasToSave = causas.filter((c) => idsToSave.has(c.id));

        const results = await Promise.all(
          causasToSave.map((causa) =>
            persistExistingCausa(causa, {
              updateCausa,
              saveBitacora,
              saveChecklist,
            }),
          ),
        );

        if (!isMountedRef.current) {
          return;
        }

        if (results.some((result) => !result)) {
          setSaveStatus('error');
          return;
        }

        setSaveStatus('saved');
        saveIdleTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) {
            return;
          }
          setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
        }, 2000);
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }
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
  }, [causas, setSaveStatus, isAuthenticated]);

  return { loadError, retryLoad: () => loadCausas() };
}
