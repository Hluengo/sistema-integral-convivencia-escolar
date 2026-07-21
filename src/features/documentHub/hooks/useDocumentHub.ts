/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { UnifiedDocument, DocumentHubFilter } from '../types/documentHub.types';
import { fetchUnifiedDocuments } from '../services/documentHub.service';

interface UseDocumentHubResult {
  documentos: UnifiedDocument[];
  filtro: DocumentHubFilter;
  setFiltro: (filtro: DocumentHubFilter) => void;
  busqueda: string;
  setBusqueda: (query: string) => void;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
}

export function useDocumentHub(): UseDocumentHubResult {
  const [documentos, setDocumentos] = useState<UnifiedDocument[]>([]);
  const [filtro, setFiltro] = useState<DocumentHubFilter>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const docs = await fetchUnifiedDocuments();
      setDocumentos(docs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar documentos.';
      setError(msg);
      setDocumentos([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return {
    documentos,
    filtro,
    setFiltro,
    busqueda,
    setBusqueda,
    cargando,
    error,
    recargar: cargar,
  };
}
