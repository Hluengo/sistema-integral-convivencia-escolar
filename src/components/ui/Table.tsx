/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (item: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (item: T) => void;
  emptyState?: ReactNode;
  className?: string;
}

export default function Table<T>({
  columns,
  data,
  keyExtractor,
  sortKey,
  sortDirection,
  onSort,
  onRowClick,
  emptyState,
  className = '',
}: TableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-neutral-200/60 ${className}`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200/60 bg-neutral-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-semibold text-neutral-600 text-xs uppercase tracking-wider ${
                  col.sortable ? 'cursor-pointer select-none hover:text-neutral-900' : ''
                } ${col.className ?? ''}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <span className="text-neutral-300">
                      {sortKey === col.key ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-brand-600" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-brand-600" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={`transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-neutral-50' : ''
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 text-neutral-700 ${col.className ?? ''}`}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
