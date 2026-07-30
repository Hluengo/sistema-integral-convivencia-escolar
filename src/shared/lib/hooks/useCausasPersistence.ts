import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Causa } from '@/src/types';
import {
  fetchCausaDetails,
  fetchCausas,
  saveBitacora,
  saveChecklist,
  updateCausa,
} from '@/src/services/cases';
import { persistExistingCausa, type CausaPersistenceChanges } from './causaPersistence';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseCausasPersistenceArgs {
  causas: Causa[];
  setCausas: Dispatch<SetStateAction<Causa[]>>;
  selectedCausaId: string;
  setSelectedCausaId: (id: string) => void;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  isAuthenticated: boolean;
}

export function useCausasPersistence({
  causas,
  setCausas,
  selectedCausaId,
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
  const loadingCausaDetailsIdsRef = useRef<Set<string>>(new Set());
  const selectedCausaIdRef = useRef(selectedCausaId);
  const loadedCausaDetailsIdsRef = useRef<Set<string>>(new Set());
  const prevCausasMapRef = useRef<Map<string, Causa>>(new Map());
  const pendingSaveRef = useRef<
    Map<string, { changes: CausaPersistenceChanges; previousCausa: Causa }>
  >(new Map());
  const [isCausaDetailLoading, setIsCausaDetailLoading] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (loadRetryTimeoutRef.current) {
        clearTimeout(loadRetryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    selectedCausaIdRef.current = selectedCausaId;
    if (!selectedCausaId) setIsCausaDetailLoading(false);
  }, [selectedCausaId]);

  const loadCausas = useCallback(
    async (retryCount = 0) => {
      if (!isAuthenticated || isLoadingCausasRef.current) return;

      isLoadingCausasRef.current = true;
      setLoadError(null);
      try {
        const loaded = await fetchCausas();
        if (!isMountedRef.current) return;

        setCausas(loaded);
        const newMap = new Map<string, Causa>();
        for (const c of loaded) {
          newMap.set(c.id, c);
        }
        prevCausasMapRef.current = newMap;
        // La carga inicial debe mostrar el listado. Una causa solo se selecciona
        // mediante una acción explícita del usuario (tabla, dashboard o documentos).
        setSelectedCausaId('');
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
      loadedCausaDetailsIdsRef.current.clear();
      setIsCausaDetailLoading(false);
      return;
    }

    if (dataInitializedRef.current) return;
    dataInitializedRef.current = true;
    void loadCausas();
  }, [isAuthenticated, loadCausas]);

  useEffect(() => {
    if (!isAuthenticated || !selectedCausaId) return;

    const causa = causas.find((item) => item.id === selectedCausaId);
    if (
      !causa ||
      loadedCausaDetailsIdsRef.current.has(causa.id) ||
      loadingCausaDetailsIdsRef.current.has(causa.id)
    ) {
      return;
    }

    // Una causa recién creada aún conserva sus antecedentes locales: no se
    // solicita una segunda copia antes de que el autoguardado los persista.
    if (causa.bitacora.length > 0 || causa.checklistDebidoProceso.length > 0) {
      loadedCausaDetailsIdsRef.current.add(causa.id);
      setIsCausaDetailLoading(false);
      return;
    }

    loadingCausaDetailsIdsRef.current.add(causa.id);
    setIsCausaDetailLoading(true);

    void fetchCausaDetails(causa.id)
      .then((details) => {
        if (!isMountedRef.current) return;

        const hydratedCausa: Causa = { ...causa, ...details };
        prevCausasMapRef.current.set(causa.id, hydratedCausa);
        loadedCausaDetailsIdsRef.current.add(causa.id);
        setCausas((current) =>
          current.map((item) => (item.id === causa.id ? hydratedCausa : item)),
        );
      })
      .catch((error: unknown) => {
        console.error('Error loading causa details:', error);
        if (isMountedRef.current) {
          setLoadError('Error al cargar los antecedentes del expediente.');
        }
      })
      .finally(() => {
        loadingCausaDetailsIdsRef.current.delete(causa.id);
        if (isMountedRef.current && selectedCausaIdRef.current === causa.id) {
          setIsCausaDetailLoading(false);
        }
      });
  }, [causas, isAuthenticated, selectedCausaId, setCausas]);

  useEffect(() => {
    if (causas.length === 0 || isLoadingCausasRef.current) {
      return;
    }

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

    if (pendingSaveRef.current.size === 0 || !isAuthenticated) {
      return;
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

      const pendingSaves = new Map(pendingSaveRef.current);
      pendingSaveRef.current.clear();

      if (pendingSaves.size === 0) {
        return;
      }

      setSaveStatus('saving');

      try {
        const causasToSave = causas.filter((c) => pendingSaves.has(c.id));

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

  return { loadError, retryLoad: () => loadCausas(), isCausaDetailLoading };
}

function serializeCausaCore(causa: Causa): string {
  const { bitacora: _bitacora, checklistDebidoProceso: _checklist, ...core } = causa;
  return JSON.stringify(core);
}

function createInitialSnapshot(causa: Causa, previousCausa: Causa | undefined): Causa {
  if (previousCausa) return previousCausa;
  return { ...causa, bitacora: [], checklistDebidoProceso: [] };
}
