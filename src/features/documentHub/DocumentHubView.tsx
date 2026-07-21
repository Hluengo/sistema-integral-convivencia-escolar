/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useCallback } from 'react';
import { useUIStore } from '@/src/shared/lib/stores/uiStore';
import { useCausasStore } from '@/src/shared/lib/stores/causasStore';
import { useDocumentHub } from './hooks/useDocumentHub';
import DocumentHubHeader from './components/DocumentHubHeader';
import DocumentList from './components/DocumentList';
import type { UnifiedDocument, DocumentHubFilter } from './types/documentHub.types';

export default function DocumentHubView() {
  const {
    documentos,
    filtro,
    setFiltro,
    busqueda,
    setBusqueda,
    cargando,
    error,
  } = useDocumentHub();

  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const setSelectedCausaId = useCausasStore((s) => s.setSelectedCausaId);
  const setSelectedStudentForDocs = useUIStore((s) => s.setSelectedStudentForDocs);

  const counts = useMemo((): Record<DocumentHubFilter, number> => ({
    todos: documentos.length,
    causas: documentos.filter((d) => d.source === 'causa').length,
    anotaciones: documentos.filter((d) => d.source === 'anotacion').length,
  }), [documentos]);

  const docsFiltrados = useMemo(() => {
    let result = documentos;

    if (filtro !== 'todos') {
      const sourceMap: Record<string, string> = { causas: 'causa', anotaciones: 'anotacion' };
      result = result.filter((d) => d.source === sourceMap[filtro]);
    }

    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.estudiante.toLowerCase().includes(q) ||
          d.titulo.toLowerCase().includes(q) ||
          (d.curso && d.curso.toLowerCase().includes(q))
      );
    }

    return result;
  }, [documentos, filtro, busqueda]);

  const handleSelectDocument = useCallback((doc: UnifiedDocument) => {
    if (doc.source === 'causa' && doc.causaData) {
      setSelectedCausaId(doc.causaData.causaId);
      setCurrentView('causas');
    } else if (doc.source === 'anotacion' && doc.estudianteId) {
      setSelectedStudentForDocs(doc.estudianteId);
      setCurrentView('documentos');
    }
  }, [setCurrentView, setSelectedCausaId, setSelectedStudentForDocs]);

  return (
    <div className="animate-fade-in space-y-6">
      <DocumentHubHeader
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        filtro={filtro}
        onFiltroChange={setFiltro}
        counts={counts}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          <span className="font-medium">Error al cargar documentos:</span>
          <span>{error}</span>
        </div>
      )}

      <DocumentList
        documentos={docsFiltrados}
        cargando={cargando}
        onSelectDocument={handleSelectDocument}
      />
    </div>
  );
}
