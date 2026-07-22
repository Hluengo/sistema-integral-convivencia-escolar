/** @license SPDX-License-Identifier: Apache-2.0 */

import { Star } from 'lucide-react';
import type { AnnotationSummary } from '@/src/shared/lib/types';

interface ClassificationOption {
  value: string;
  label: string;
  desc: string;
  legal?: string;
}

interface ClassificationStepProps {
  value: string;
  onChange: (value: string) => void;
  summary: AnnotationSummary | null;
  options?: ClassificationOption[];
  suggestedType?: string | null;
}

const FALLBACK_OPTIONS: ClassificationOption[] = [
  {
    value: 'none',
    label: 'Sin carta',
    desc: 'Menos de 5 anotaciones negativas. No requiere medida disciplinaria.',
  },
  {
    value: 'amonestacion',
    label: 'Amonestación Escrita',
    desc: 'Para estudiantes con 5-9 anotaciones negativas. Medida formativa.',
    legal: 'Art. 24 RICE 2026 - Circular 482',
  },
  {
    value: 'compromiso',
    label: 'Carta de Compromiso Conductual',
    desc: 'Para estudiantes con 10-14 anotaciones. Acuerdo formal.',
    legal: 'Art. 25 RICE 2026 - Ley 21.809',
  },
  {
    value: 'derivacion',
    label: 'Derivación a Convivencia Escolar',
    desc: 'Para estudiantes con 15+ anotaciones. Intervención especializada.',
    legal: 'Art. 26-27 RICE 2026 - Circular 482',
  },
];

const LEGEND: Record<string, { label: string; legal: string }> = {
  none: { label: 'Sin carta', legal: 'Sin medida requerida' },
  amonestacion: { label: 'Amonestación Escrita', legal: 'Circular 482' },
  compromiso: { label: 'Carta de Compromiso Conductual', legal: 'Ley 21.809' },
  derivacion: { label: 'Derivación a Convivencia Escolar', legal: 'Circular 482' },
};

export default function ClassificationStep({
  value,
  onChange,
  summary,
  options,
  suggestedType,
}: ClassificationStepProps) {
  const total = summary ? summary.negativas + summary.positivas + summary.informativas : 0;

  const displayOptions = options && options.length > 0 ? options : FALLBACK_OPTIONS;

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
          {suggestedType && suggestedType !== 'none' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="font-medium text-amber-700 text-xs">
                Sugerido: {LEGEND[suggestedType]?.label || suggestedType}
              </p>
            </div>
          )}
          <p className="text-center font-medium text-neutral-500 text-xs">
            Total: {total} anotaciones detectadas
          </p>
        </div>
      )}

      <div className="space-y-2">
        {displayOptions.map((opt) => (
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
            {opt.desc && <p className="mt-1 text-neutral-500 text-xs">{opt.desc}</p>}
            {opt.legal && <p className="mt-1 font-mono text-neutral-400 text-xs">{opt.legal}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}
