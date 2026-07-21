/** @license SPDX-License-Identifier: Apache-2.0 */

import { CLASSIFICATION_OPTIONS } from './constants';

interface ClassificationStepProps {
  value: string;
  onChange: (value: string) => void;
  detected: unknown[];
}

export default function ClassificationStep({ value, onChange, detected }: ClassificationStepProps) {
  const negativeCount = detected.filter((a) => (a as Record<string, string>).type === 'Negativa').length;
  const positiveCount = detected.filter((a) => (a as Record<string, string>).type === 'Positiva').length;
  const infoCount = detected.length - negativeCount - positiveCount;

  return (
    <div className="space-y-4">
      <p className="font-medium text-neutral-600 text-sm">Clasificación de la Medida</p>

      {detected.length > 0 && (
        <div className="rounded-xl bg-neutral-50 p-3 text-sm">
          <p className="text-neutral-600">
            <span className="font-semibold text-neutral-800">{detected.length}</span> anotaciones detectadas:
            {' '}<span className="font-semibold text-red-600">{negativeCount} negativas</span>
            {positiveCount > 0 && (
              <>, <span className="font-semibold text-emerald-600">{positiveCount} positivas</span></>
            )}
            {infoCount > 0 && (
              <>, <span className="font-semibold text-blue-600">{infoCount} informativas</span></>
            )}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {CLASSIFICATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`w-full rounded-xl border p-4 text-left transition-all${
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
