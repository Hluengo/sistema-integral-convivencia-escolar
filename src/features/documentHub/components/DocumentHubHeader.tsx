/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from 'react';
import { Search, FolderOpen } from 'lucide-react';
import DocumentFilters from './DocumentFilters';
import type { DocumentHubFilter } from '../types/documentHub.types';

interface DocumentHubHeaderProps {
  busqueda: string;
  onBusquedaChange: (value: string) => void;
  filtro: DocumentHubFilter;
  onFiltroChange: (filter: DocumentHubFilter) => void;
  counts: Record<DocumentHubFilter, number>;
}

export default memo(function DocumentHubHeader({
  busqueda,
  onBusquedaChange,
  filtro,
  onFiltroChange,
  counts,
}: DocumentHubHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg sm:p-8">
      <div
        className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60"
        aria-hidden="true"
      />
      <div className="relative space-y-4">
        <div>
          <p className="mb-1 font-semibold text-blue-200/80 text-xs uppercase tracking-wider">
            Convivencia Escolar &middot; Debido Proceso
          </p>
          <h2 className="flex items-center gap-2 font-bold text-2xl tracking-tight sm:text-3xl">
            <FolderOpen className="h-7 w-7" />
            Document Hub
          </h2>
          <p className="mt-2 text-blue-100/80 text-sm">
            Vista unificada de todos los documentos del sistema
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por estudiante o documento..."
              value={busqueda}
              onChange={(e) => onBusquedaChange(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 pr-4 pl-10 font-medium text-sm text-white placeholder:text-white/50 transition-all hover:border-white/30 focus:border-white focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <DocumentFilters
            activeFilter={filtro}
            onFilterChange={onFiltroChange}
            counts={counts}
          />
        </div>
      </div>
    </div>
  );
});
