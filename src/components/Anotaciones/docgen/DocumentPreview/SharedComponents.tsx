/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Annotation } from '../../../../types';

export function AnnotationsList({ annotations }: { annotations: Annotation[] }) {
  if (!annotations.length) {
    return <p className="text-neutral-400 text-sm italic">No se han seleccionado anotaciones.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {annotations.map((ann, idx) => (
        <li
          key={ann.id}
          className="flex items-start gap-2 border-neutral-200 border-b border-dashed pb-1.5 text-neutral-700 text-xs last:border-b-0"
        >
          <span className="w-5 shrink-0 text-right font-mono text-neutral-400">{idx + 1}.</span>
          <span className="shrink-0 whitespace-nowrap font-medium text-neutral-500">
            {ann.date ?? '—'}
          </span>
          <span className="text-neutral-700 leading-snug">{ann.text}</span>
          <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-wide ${
            ann.severity === 'Leve'
              ? 'bg-yellow-100 text-yellow-700'
              : ann.severity === 'Grave'
                ? 'bg-orange-100 text-orange-700'
                : ann.severity === 'Muy Grave'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-rose-100 text-rose-800'
          }`}>
            {ann.severity}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-3 flex items-center gap-2 border-neutral-300 border-b-2 pb-1 font-bold text-neutral-800 text-sm">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 font-bold text-[11px] text-white">
          {number}
        </span>
        {title}
      </h3>
      <div className="space-y-1.5 text-neutral-700 text-xs leading-relaxed">{children}</div>
    </div>
  );
}

export function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <p className="flex gap-2">
      <span className="w-36 shrink-0 font-semibold text-neutral-600">{label}:</span>
      <span className="text-neutral-800">{value}</span>
    </p>
  );
}
