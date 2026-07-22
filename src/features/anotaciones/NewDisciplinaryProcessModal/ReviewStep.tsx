/** @license SPDX-License-Identifier: Apache-2.0 */

import { CLASSIFICATION_OPTIONS } from './constants';
import type { AnnotationSummary } from '@/src/shared/lib/types';

interface ReviewStepProps {
  studentName: string;
  course: string;
  summary: AnnotationSummary | null;
  classification: string;
  fileName: string;
}

export default function ReviewStep({
  studentName,
  course,
  summary,
  classification,
  fileName,
}: ReviewStepProps) {
  const classLabel =
    CLASSIFICATION_OPTIONS.find((o) => o.value === classification)?.label || classification;
  const total = summary ? summary.negativas + summary.positivas + summary.informativas : 0;

  return (
    <div className="space-y-4">
      <p className="font-medium text-neutral-600 text-sm">Revisión Final</p>

      <div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Estudiante:</span>
          <span className="font-medium text-neutral-800">{studentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Curso:</span>
          <span className="font-medium text-neutral-800">{course}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Anotaciones:</span>
          <span className="font-medium text-neutral-800">
            {summary
              ? `${total} total (${summary.negativas} negativas${summary.positivas > 0 ? ` / ${summary.positivas} positivas` : ''}${summary.informativas > 0 ? ` / ${summary.informativas} informativas` : ''})`
              : 'Sin análisis'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Medida:</span>
          <span className="font-medium text-neutral-800">{classLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Documento:</span>
          <span className="font-medium text-neutral-800">{fileName || 'Ninguno'}</span>
        </div>
      </div>

      {summary && summary.negativas > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="font-semibold text-red-700 text-xs uppercase tracking-wider">
            Motivo de la medida
          </p>
          <p className="mt-1 text-red-600 text-sm">
            Se detectaron {summary.negativas} anotaciones negativas que motivan la aplicación de:{' '}
            {classLabel}.
          </p>
        </div>
      )}
    </div>
  );
}
