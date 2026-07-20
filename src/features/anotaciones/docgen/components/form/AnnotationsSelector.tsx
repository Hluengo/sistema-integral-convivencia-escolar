/** @license SPDX-License-Identifier: Apache-2.0 */

import { CheckSquare, Square } from 'lucide-react';
import type { Annotation } from '@/src/types';

interface AnnotationsSelectorProps {
  negativeCount: number;
  negativeAnnotations: Annotation[];
  selectedAnnotationsForDoc: string[];
  onToggleAnnotation: (id: string) => void;
}

export default function AnnotationsSelector({
  negativeCount,
  negativeAnnotations,
  selectedAnnotationsForDoc,
  onToggleAnnotation,
}: AnnotationsSelectorProps) {
  const selectedAnnotationsSet = new Set(selectedAnnotationsForDoc);

  return (
    <fieldset>
      <legend className="block font-medium text-neutral-700 text-sm">
        Anotaciones Negativas ({negativeCount})
      </legend>
      {selectedAnnotationsForDoc.length > 0 && (
        <span className="mb-2 block font-medium text-brand-600 text-xs">
          {selectedAnnotationsForDoc.length} seleccionada(s)
        </span>
      )}
      {negativeAnnotations.length === 0 ? (
        <p className="text-neutral-500 text-sm italic">
          No hay anotaciones negativas para seleccionar.
        </p>
      ) : (
        <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-lg border border-neutral-200 p-2">
          {negativeAnnotations.map((a) => {
            const isSelected = selectedAnnotationsSet.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onToggleAnnotation(a.id)}
                className={`flex w-full items-start gap-2.5 rounded-md p-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border border-brand-200 bg-brand-50'
                    : 'border border-neutral-100 bg-white hover:bg-neutral-50'
                }`}
              >
                {isSelected ? (
                  <Square className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
                ) : (
                  <Square className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-neutral-800 text-sm">
                    {a.text || ''}
                  </span>
                  <span className="mt-0.5 block text-neutral-500 text-xs">
                    {a.date ? new Date(a.date).toLocaleDateString('es-CL') : ''} &middot;{' '}
                    {a.severity || 'Sin asignatura'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}