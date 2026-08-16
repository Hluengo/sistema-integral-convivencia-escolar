/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { AlertTriangle, Check, Pencil, X } from 'lucide-react';
import { CLASSIFICATION_OPTIONS } from './constants';
import type { AnnotationSummary } from '@/shared/lib/types';
import Button from '@/shared/ui/Button';

export type { ReviewAnnotation, ReviewAnnotationType } from './reviewAnnotationUtils';
import type { ReviewAnnotation, ReviewAnnotationType } from './reviewAnnotationUtils';

interface ReviewStepProps {
  studentName: string;
  course: string;
  summary: AnnotationSummary | null;
  classification: string;
  fileName: string;
  annotations?: ReviewAnnotation[];
  warnings?: string[];
  onAnnotationTypeChange?: (sequenceNumber: number, type: ReviewAnnotationType) => void;
  onAnnotationTextChange?: (sequenceNumber: number, text: string) => void;
}

const TYPE_LABELS: Record<ReviewAnnotationType, string> = {
  negative: 'Negativa',
  positive: 'Positiva',
  information: 'Informativa',
};

function getClassificationLabel(classification: string): string {
  return (
    CLASSIFICATION_OPTIONS.find((option) => option.value === classification)?.label ||
    classification
  );
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
  onAnnotationTextChange,
}: ReviewStepProps) {
  const [editingSequenceNumber, setEditingSequenceNumber] = useState<number | null>(null);
  const [draftText, setDraftText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const classLabel = getClassificationLabel(classification);
  const total = summary ? summary.negativas + summary.positivas + summary.informativas : 0;

  const startEditing = (annotation: ReviewAnnotation) => {
    setEditingSequenceNumber(annotation.sequence_number);
    setDraftText(annotation.raw_text);
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingSequenceNumber(null);
    setDraftText('');
    setEditError(null);
  };

  const saveEditedText = (sequenceNumber: number) => {
    const nextText = draftText.trim();
    if (!nextText) {
      setEditError('La anotación no puede quedar vacía.');
      return;
    }
    onAnnotationTextChange?.(sequenceNumber, nextText);
    cancelEditing();
  };

  return (
    <div className="space-y-4">
      <p className="font-medium text-neutral-600 text-sm">Revisión antes de confirmar</p>

      <div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Estudiante:</span>
          <span className="text-right font-medium text-neutral-800">
            {studentName || 'Pendiente'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Curso:</span>
          <span className="text-right font-medium text-neutral-800">
            {course || 'No detectado'}
          </span>
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
          <span className="text-right font-medium text-neutral-800">
            {classLabel || 'Sin sugerencia'}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">Documento:</span>
          <span className="text-right font-medium text-neutral-800">{fileName || 'Ninguno'}</span>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2 rounded-xl border border-grave-200 bg-grave-50 p-4 text-grave-700 text-sm">
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
              <div
                key={annotation.sequence_number}
                className="rounded-xl border border-neutral-200 p-3 text-sm"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-neutral-700">
                    #{annotation.sequence_number} · Página {annotation.page_number ?? '-'}
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={annotation.type}
                      onChange={(event) =>
                        onAnnotationTypeChange?.(
                          annotation.sequence_number,
                          event.target.value as ReviewAnnotationType,
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
                    {onAnnotationTextChange &&
                      editingSequenceNumber !== annotation.sequence_number && (
                        <button
                          type="button"
                          onClick={() => startEditing(annotation)}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-2 py-1 font-medium text-neutral-600 text-xs transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                          aria-label={`Editar texto de la anotación ${annotation.sequence_number}`}
                          title="Editar anotación"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Editar
                        </button>
                      )}
                  </div>
                </div>
                {editingSequenceNumber === annotation.sequence_number ? (
                  <div className="space-y-2">
                    <textarea
                      value={draftText}
                      onChange={(event) => {
                        setDraftText(event.target.value);
                        if (editError) setEditError(null);
                      }}
                      rows={4}
                      maxLength={4000}
                      autoFocus
                      className="w-full resize-y rounded-lg border border-brand-300 bg-white p-2 text-neutral-700 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      aria-label={`Texto de la anotación ${annotation.sequence_number}`}
                      aria-invalid={Boolean(editError)}
                    />
                    {editError && (
                      <p className="text-gravisima-600 text-xs" role="alert">
                        {editError}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={cancelEditing}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEditedText(annotation.sequence_number)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="line-clamp-3 text-neutral-600 text-xs">{annotation.raw_text}</p>
                )}
                {(annotation.detected_date || annotation.detected_teacher) && (
                  <p className="mt-2 text-neutral-400 text-xs">
                    {annotation.detected_date ? `Fecha: ${annotation.detected_date}` : ''}
                    {annotation.detected_date && annotation.detected_teacher ? ' · ' : ''}
                    {annotation.detected_teacher
                      ? `Responsable: ${annotation.detected_teacher}`
                      : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {summary && summary.negativas > 0 && (
        <div className="rounded-xl border border-gravisima-100 bg-gravisima-50 p-4">
          <p className="font-semibold text-gravisima-700 text-xs uppercase tracking-wider">
            Motivo de la sugerencia
          </p>
          <p className="mt-1 text-gravisima-600 text-sm">
            Se detectaron {summary.negativas} anotaciones negativas. La carta sugerida se obtiene
            desde las reglas configuradas en base de datos.
          </p>
        </div>
      )}
    </div>
  );
}
