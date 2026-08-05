/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { queryClient } from '../../lib/queryClient';
import { useCausaDetailsQuery, useCausasQuery } from '../../shared/lib/hooks/useCausasQuery';
import { useCausasPersistence } from '../../shared/lib/hooks/useCausasPersistence';
import {
  mergeCausasList,
  syncPersistedCausasToCache,
} from '../../shared/lib/queries/causasQueryCache';
import { causasQueryKeys } from '../../shared/lib/queries/causasQueryKeys';
import { getFaseForEstado } from '../../shared/lib/data';
import { useCausasStore } from '../../shared/lib/stores/causasStore';
import { EstadoCausa } from '../../shared/lib/types';

interface UseCausaWorkspaceArgs {
  isAuthenticated: boolean;
  tenantId: string | null;
  setCurrentView: (view: 'dashboard') => void;
  setMobileShowDetail: (show: boolean) => void;
}

export function useCausaWorkspace({
  isAuthenticated,
  tenantId,
  setCurrentView,
  setMobileShowDetail,
}: UseCausaWorkspaceArgs) {
  const causas = useCausasStore((s) => s.causas);
  const selectedCausaId = useCausasStore((s) => s.selectedCausaId);
  const setSelectedCausaId = useCausasStore((s) => s.setSelectedCausaId);
  const setSaveStatus = useCausasStore((s) => s.setSaveStatus);
  const selectedFaseFilter = useCausasStore((s) => s.selectedFaseFilter);
  const searchQuery = useCausasStore((s) => s.searchQuery);
  const setCausas = useCausasStore((s) => s.setCausas);

  const causasQuery = useCausasQuery();
  const selectedCausaForDetail =
    isAuthenticated && causas.some((causa) => causa.id === selectedCausaId) ? selectedCausaId : '';
  const causaDetailsQuery = useCausaDetailsQuery(selectedCausaForDetail);
  const hasInitializedCausasRef = useRef(false);
  const lastCausasQueryDataRef = useRef<typeof causasQuery.data>(undefined);
  const lastDetailsQueryDataRef = useRef<typeof causaDetailsQuery.data>(undefined);

  const selectedCausa = useMemo(
    () => causas.find((causa) => causa.id === selectedCausaId) || null,
    [causas, selectedCausaId],
  );

  const filteredCausas = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    return causas.filter((causa) => {
      if (causa.estadoActual === EstadoCausa.CAUSA_CERRADA) return false;
      if (
        selectedFaseFilter !== 'Todas' &&
        getFaseForEstado(causa.estadoActual) !== selectedFaseFilter
      ) {
        return false;
      }
      if (!trimmedQuery) return true;
      return (
        causa.estudianteNombre.toLowerCase().includes(trimmedQuery) ||
        causa.nnaProtectedName.toLowerCase().includes(trimmedQuery) ||
        causa.id.toLowerCase().includes(trimmedQuery) ||
        causa.estudianteCurso.toLowerCase().includes(trimmedQuery)
      );
    });
  }, [causas, selectedFaseFilter, searchQuery]);

  const handlePersistedCausas = useCallback(
    (persistedCausas: typeof causas) => {
      if (tenantId) syncPersistedCausasToCache(tenantId, persistedCausas);
    },
    [tenantId],
  );

  const { markCausasHydrated, markCausaHydrated } = useCausasPersistence({
    causas,
    setSaveStatus,
    isAuthenticated,
    onPersisted: handlePersistedCausas,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      lastCausasQueryDataRef.current = undefined;
      lastDetailsQueryDataRef.current = undefined;
      hasInitializedCausasRef.current = false;
      setCurrentView('dashboard');
      setMobileShowDetail(false);
      // Evita un ciclo de render: [] es una nueva referencia en cada efecto.
      // Solo limpiamos Zustand si hay información efectivamente cargada.
      if (causas.length > 0) setCausas([]);
      if (selectedCausaId) setSelectedCausaId('');
      queryClient.removeQueries({ queryKey: causasQueryKeys.root });
      return;
    }

    if (!causasQuery.data || lastCausasQueryDataRef.current === causasQuery.data) return;

    const hydratedCausas = mergeCausasList(causas, causasQuery.data);
    markCausasHydrated(hydratedCausas);
    lastCausasQueryDataRef.current = causasQuery.data;
    setCausas(hydratedCausas);
    if (!hasInitializedCausasRef.current) {
      // La carga inicial siempre presenta la tabla: no abre expedientes por defecto.
      setSelectedCausaId('');
      hasInitializedCausasRef.current = true;
    }
  }, [
    causas,
    causasQuery.data,
    isAuthenticated,
    markCausasHydrated,
    selectedCausaId,
    setCausas,
    setSelectedCausaId,
    setCurrentView,
    setMobileShowDetail,
  ]);

  useEffect(() => {
    if (!selectedCausaForDetail || !causaDetailsQuery.data) return;
    if (lastDetailsQueryDataRef.current === causaDetailsQuery.data) return;

    const currentCausa = causas.find((causa) => causa.id === selectedCausaForDetail);
    if (!currentCausa) return;

    const hydratedCausa = { ...currentCausa, ...causaDetailsQuery.data };
    markCausaHydrated(hydratedCausa);
    lastDetailsQueryDataRef.current = causaDetailsQuery.data;
    setCausas((current) =>
      current.map((causa) => (causa.id === hydratedCausa.id ? hydratedCausa : causa)),
    );
  }, [causaDetailsQuery.data, causas, markCausaHydrated, selectedCausaForDetail, setCausas]);

  const loadError = useMemo(() => {
    const error = causasQuery.error ?? causaDetailsQuery.error;
    if (!error) return null;
    return selectedCausaForDetail
      ? 'Error al cargar los antecedentes del expediente.'
      : 'Error al cargar los expedientes. Verifique su conexión.';
  }, [causaDetailsQuery.error, causasQuery.error, selectedCausaForDetail]);

  const retryLoad = useCallback(() => {
    if (selectedCausaForDetail && causaDetailsQuery.error) {
      void causaDetailsQuery.refetch();
      return;
    }
    void causasQuery.refetch();
  }, [causaDetailsQuery, causasQuery, selectedCausaForDetail]);

  const loadMoreCausas = useCallback(() => {
    if (!causasQuery.hasNextPage || causasQuery.isFetchingNextPage) return;
    void causasQuery.fetchNextPage();
  }, [causasQuery]);

  return {
    causas,
    selectedCausaId,
    setSelectedCausaId,
    selectedCausa,
    filteredCausas,
    loadError,
    retryLoad,
    hasMoreCausas: Boolean(causasQuery.hasNextPage),
    isLoadingMoreCausas: causasQuery.isFetchingNextPage,
    loadMoreCausas,
    isCausaDetailLoading: causaDetailsQuery.isLoading,
  };
}
