/** @license SPDX-License-Identifier: Apache-2.0 */

import { Trash2 } from 'lucide-react';

export type ReviewAnnotation = {
  text: string;
  date: string;
  severity: 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima';
  registered_by: string;
  type: 'Positiva' | 'Negativa';
};

interface Props {
  annotations: ReviewAnnotation[];
  onChange: (next: ReviewAnnotation[]) => void;
}

const SEVERITIES: ReviewAnnotation['severity'][] = ['Leve', 'Grave', 'Muy Grave', 'Gravísima'];

export default function AnnotationReviewTable({ annotations, onChange }: Props) {
  const update = (index: number, patch: Partial<ReviewAnnotation>) => {
    const next = annotations.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(annotations.filter((_, i) => i !== index));
  };

  if (annotations.length === 0) {
    return (
      <div className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg p-4 text-center">
        No hay anotaciones para revisar. Puede volver a analizar el documento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        Revise y edite el resultado de la IA antes de guardar. Ninguna anotación se persiste sin su
        confirmación.
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Gravedad</th>
              <th className="px-3 py-2 text-left">Descripción</th>
              <th className="px-3 py-2 text-left">Registrado por</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {annotations.map((ann, idx) => {
              const annId = (ann as { id?: string }).id ?? `ann-${idx}`;
              return (
              <tr key={annId} className="bg-white">
                <td className="px-3 py-2">
                  <label htmlFor={`ann-date-${idx}`} className="sr-only">Fecha</label>
                  <input
                    id={`ann-date-${idx}`}
                    type="date"
                    value={ann.date?.slice(0, 10) || ''}
                    onChange={(e) => update(idx, { date: e.target.value })}
                    className="border border-slate-200 rounded px-1.5 py-1 w-32"
                  />
                </td>
                <td className="px-3 py-2">
                  <label htmlFor={`ann-type-${idx}`} className="sr-only">Tipo</label>
                  <select
                    id={`ann-type-${idx}`}
                    value={ann.type}
                    onChange={(e) => update(idx, { type: e.target.value as ReviewAnnotation['type'] })}
                    className="border border-slate-200 rounded px-1.5 py-1"
                  >
                    <option value="Negativa">Negativa</option>
                    <option value="Positiva">Positiva</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <label htmlFor={`ann-severity-${idx}`} className="sr-only">Gravedad</label>
                  <select
                    id={`ann-severity-${idx}`}
                    value={ann.severity}
                    onChange={(e) =>
                      update(idx, { severity: e.target.value as ReviewAnnotation['severity'] })
                    }
                    className="border border-slate-200 rounded px-1.5 py-1"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 min-w-[220px]">
                  <label htmlFor={`ann-text-${idx}`} className="sr-only">Descripción</label>
                  <input
                    id={`ann-text-${idx}`}
                    type="text"
                    value={ann.text}
                    onChange={(e) => update(idx, { text: e.target.value })}
                    className="border border-slate-200 rounded px-1.5 py-1 w-full"
                  />
                </td>
                <td className="px-3 py-2">
                  <label htmlFor={`ann-registered-${idx}`} className="sr-only">Registrado por</label>
                  <input
                    id={`ann-registered-${idx}`}
                    onChange={(e) => update(idx, { registered_by: e.target.value })}
                    className="border border-slate-200 rounded px-1.5 py-1 w-36"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
