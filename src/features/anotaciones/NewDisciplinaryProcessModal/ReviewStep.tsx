/** @license SPDX-License-Identifier: Apache-2.0 */

import { AlertTriangle } from 'lucide-react';
import { CLASSIFICATION_OPTIONS } from './constants';
import type { AnnotationSummary } from '@/src/shared/lib/types';

export type ReviewAnnotationType = 'negative' | 'positive' | 'information';

export interface ReviewAnnotation {
  raw_text: string;
  normalized_text: string;
  type: ReviewAnnotationType;
  page_number: number | null;
  sequence_number: number;
  detected_date: string | null;
  detected_teacher: string | null;
  confidence: number;
}

interface ReviewStepProps {
  studentName: string;
  course: string;
  summary: AnnotationSummary | null;
  classification: string;
  fileName: string;
  annotations?: ReviewAnnotation[];
  warnings?: string[];
  onAnnotationTypeChange?: (sequenceNumber: number, type: ReviewAnnotationType) => void;
}

const TYPE_LABELS: Record<ReviewAnnotationType, string> = {
  negative: 'Negativa',
  positive: 'Positiva',
  information: 'Informativa',
};

function getClassificationLabel(classification: string): string {
  return CLASSIFICATION_OPTIONS.find((option) => option.value === classification)?.label || classification;
}

export default function ReviewStep({
  studentName,
  course,
  summary,
  classification,
  fileName,
  annotations = [],
  warnings = [],
  onAnnotationTypeChange,
}: ReviewStepProps) {
  const classLabel = getClassificationLabel(classification);
  const total = summary ? summary.negativas + summary.positivas + summary.informativas : 0;

  return (
    <div className="space-y-4">
      <p className="font-medium text-neutral-600 text-sm">Revisión antes de confirmar</p>

      <div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Estudiante:</span>
          <span className="text-right font-medium text-neutral-800">{studentName || 'Pendiente'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Curso:</span>
          <span className="text-right font-medium text-neutral-800">{course || 'No detectado'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Anotaciones:</span>
          <span className="text-right font-medium text-neutral-800">
            {summary
              ? `${total} total (${summary.negativas} negativas / ${summary.positivas} positivas / ${summary.informativas} informativas)`
              : 'Sin análisis'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Carta sugerida:</span>
          <span className="text-right font-medium text-neutral-800">{classLabel || 'Sin sugerencia'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Documento:</span>
          <span className="text-right font-medium text-neutral-800">{fileName || 'Ninguno'}</span>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Advertencias del análisis
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {annotations.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-neutral-700 text-sm">Detalle detectado</p>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {annotations.map((annotation) => (
              <div key={annotation.sequence_number} className="rounded-xl border border-neutral-200 p-3 text-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-neutral-700">
                    #{annotation.sequence_number} · Página {annotation.page_number ?? '-'}
                  </span>
                  <select
                    value={annotation.type}
                    onChange={(event) =>
                      onAnnotationTypeChange?.(
                        annotation.sequence_number,
                        event.target.value as ReviewAnnotationType
                      )
                    }
                    className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500"
                    aria-label={`Clasificación anotación ${annotation.sequence_number}`}
                  >
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="line-clamp-3 text-neutral-600 text-xs">{annotation.raw_text}</p>
                {(annotation.detected_date || annotation.detected_teacher) && (
                  <p className="mt-2 text-neutral-400 text-xs">
                    {annotation.detected_date ? `Fecha: ${annotation.detected_date}` : ''}
                    {annotation.detected_date && annotation.detected_teacher ? ' · ' : ''}
                    {annotation.detected_teacher ? `Responsable: ${annotation.detected_teacher}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {summary && summary.negativas > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="font-semibold text-red-700 text-xs uppercase tracking-wider">Motivo de la sugerencia</p>
          <p className="mt-1 text-red-600 text-sm">
            Se detectaron {summary.negativas} anotaciones negativas. La carta sugerida se obtiene desde las reglas configuradas en base de datos.
          </p>
        </div>
      )}
    </div>
  );
}
