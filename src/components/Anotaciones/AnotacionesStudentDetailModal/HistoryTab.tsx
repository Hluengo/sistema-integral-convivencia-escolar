/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScrollText } from 'lucide-react';
import type { Annotation } from '../../../types';
import { formatDate, SEVERITY_BADGE } from './constants';

interface HistoryTabProps {
  annotations: Annotation[];
}

export default function HistoryTab({ annotations }: HistoryTabProps) {
  if (annotations.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 text-center shadow-xs">
        <ScrollText className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
        <p className="text-neutral-500 text-sm">
          Este estudiante no tiene anotaciones registradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {annotations.map((ann) => {
        const badge = SEVERITY_BADGE[ann.severity] || SEVERITY_BADGE.Leve;
        return (
          <div
            key={ann.id}
            className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider${badge.bg} ${badge.text}`}
                  >
                    <span className={`inline-block h-1.5 w-1.5 rounded-full${badge.dot}`} />
                    {ann.severity}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider ${
                      ann.type === 'Positiva'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {ann.type}
                  </span>
                  <span className="text-neutral-400 text-xs">{formatDate(ann.date)}</span>
                </div>
                <p className="text-neutral-700 text-sm leading-relaxed">{ann.text}</p>
              </div>
            </div>
            {ann.registered_by && (
              <div className="mt-2 border-t border-neutral-100 pt-2">
                <p className="text-neutral-400 text-xs">
                  Registrado por:{' '}
                  <span className="font-medium text-neutral-600">{ann.registered_by}</span>
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
