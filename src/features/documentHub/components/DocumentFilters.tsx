/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from 'react';
import type { DocumentHubFilter } from '../types/documentHub.types';

interface FilterTab {
  key: DocumentHubFilter;
  label: string;
  count?: number;
}

interface DocumentFiltersProps {
  activeFilter: DocumentHubFilter;
  onFilterChange: (filter: DocumentHubFilter) => void;
  counts: Record<DocumentHubFilter, number>;
}

const FILTER_TABS: FilterTab[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'causas', label: 'Causas' },
  { key: 'anotaciones', label: 'Anotaciones' },
];

export default memo(function DocumentFilters({
  activeFilter,
  onFilterChange,
  counts,
}: DocumentFiltersProps) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.key;
        const count = counts[tab.key] ?? 0;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-semibold text-sm transition-all duration-150 ${
              isActive
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                isActive
                  ? 'bg-neutral-100 text-neutral-600'
                  : 'bg-neutral-200/60 text-neutral-500'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
});
