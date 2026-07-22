/** @license SPDX-License-Identifier: Apache-2.0 */

import { Star } from 'lucide-react';
import { CLASSIFICATION_OPTIONS } from './constants';
import type { AnnotationSummary } from '@/src/shared/lib/types';

interface ClassificationStepProps {
  value: string;
  onChange: (value: string) => void;
  summary: AnnotationSummary | null;
}

export default function ClassificationStep({ value, onChange, summary }: ClassificationStepProps) {
  const total = summary ? summary.negativas + summary.positivas + summary.informativas : 0;
  console.log('[CLASSIFY] summary:', JSON.stringify(summary), 'total:', total);

  return (
    <div className="space-y-4">
      <p className="font-medium text-neutral-600 text-sm">Clasificación de la Medida</p>

      {summary && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-indigo-600" />
            <p className="font-medium text-neutral-700 text-sm">Resultado del Análisis</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="font-bold text-2xl text-red-700">{summary.negativas}</p>
              <p className="mt-1 font-medium text-red-600 text-xs">Negativas</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="font-bold text-2xl text-emerald-700">{summary.positivas}</p>
              <p className="mt-1 font-medium text-emerald-600 text-xs">Positivas</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="font-bold text-2xl text-blue-700">{summary.informativas}</p>
              <p className="mt-1 font-medium text-blue-600 text-xs">Informativas</p>
            </div>
          </div>
          <p className="text-center font-medium text-neutral-500 text-xs">
            Total: {total} anotaciones detectadas
          </p>
        </div>
      )}

      <div className="space-y-2">
        {CLASSIFICATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`w-full rounded-xl border p-4 text-left transition-colors${
              value === opt.value
                ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            <p className="font-semibold text-neutral-800 text-sm">{opt.label}</p>
            <p className="mt-1 text-neutral-500 text-xs">{opt.desc}</p>
            <p className="mt-1 font-mono text-neutral-400 text-xs">{opt.legal}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
