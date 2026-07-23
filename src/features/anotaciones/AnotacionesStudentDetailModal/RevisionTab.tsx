/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle2, FileText, RefreshCw, X } from 'lucide-react';
import type { CartaDisciplinaria } from '@/src/shared/lib/types';
import type { ReviewAnnotationType } from '../NewDisciplinaryProcessModal/ReviewStep';
import ReviewStep from '../NewDisciplinaryProcessModal/ReviewStep';
import { formatDate, type StudentInfo } from './constants';
import { useStudentPdfDisciplinaryReview } from './hooks/useStudentPdfDisciplinaryReview';

interface RevisionTabProps {
  student: StudentInfo;
  counts: { negativas: number; positivas: number; informativas: number };
  currentCarta: CartaDisciplinaria | null;
  onConfirmed: () => void | Promise<void>;
}

const RECOMMENDATION_LABEL: Record<string, string> = {
  mantener: 'Mantener seguimiento actual',
  escalar: 'Escalar medida disciplinaria',
  derivar: 'Derivar a Convivencia Escolar',
  revisar_conflicto: 'Revisar conflicto de estudiante',
};

export default function RevisionTab({ student, counts, currentCarta, onConfirmed }: RevisionTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLButtonElement>(null);
  const review = useStudentPdfDisciplinaryReview({
    studentId: student.id,
    studentName: student.full_name,
    currentNegativeCount: counts.negativas,
    currentLetterType: currentCarta?.letter_type,
    onConfirmed,
  });

  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      review.setIsDragging(true);
    },
    [review]
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (dropZoneRef.current && !dropZoneRef.current.contains(event.relatedTarget as Node)) {
        review.setIsDragging(false);
      }
    },
    [review]
  );

  const totalDetected = review.summary
    ? review.summary.negativas + review.summary.positivas + review.summary.informativas
    : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-bold text-neutral-900">Revisión de PDF del estudiante</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-neutral-50 p-3">
            <p className="text-xs font-semibold text-neutral-400">Negativas en Supabase</p>
            <p className="mt-1 text-xl font-black text-neutral-900">{counts.negativas}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <p className="text-xs font-semibold text-neutral-400">Carta vigente</p>
            <p className="mt-1 text-sm font-bold text-neutral-900">{currentCarta?.letter_type || 'Sin carta vigente'}</p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-3">
            <p className="text-xs font-semibold text-neutral-400">Última emisión</p>
            <p className="mt-1 text-sm font-bold text-neutral-900">{currentCarta ? formatDate(currentCarta.emission_date) : '-'}</p>
          </div>
        </div>
      </section>

      <button
        ref={dropZoneRef}
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDrop={review.handleDrop}
        disabled={review.isBusy}
        className={`w-full rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          review.isDragging ? 'border-brand-400 bg-brand-50' : 'border-neutral-300 bg-white hover:border-brand-300 hover:bg-brand-50/30'
        } ${review.isBusy ? 'cursor-wait opacity-70' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={review.handleFileSelect}
          className="hidden"
          aria-label="Seleccionar PDF de hoja de vida"
        />
        <div className="flex flex-col items-center gap-3">
          {review.isBusy ? (
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          ) : (
            <RefreshCw className="h-10 w-10 text-neutral-300" />
          )}
          <div>
            <p className="text-sm font-semibold text-neutral-800">
              {review.file ? review.file.name : 'Subir PDF actualizado de hoja de vida'}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Se analizará y comparará antes de registrar cualquier cambio.
            </p>
          </div>
        </div>
      </button>

      {review.statusMessage && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
          {review.statusMessage}
        </div>
      )}

      {review.errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{review.errorMessage}</span>
            <button type="button" onClick={() => review.setErrorMessage(null)} className="ml-auto text-red-500 hover:text-red-700" aria-label="Cerrar error">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {review.summary && review.comparison && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Resultado comparado</h3>
              <p className="text-xs text-neutral-500">{totalDetected} anotaciones detectadas en el PDF.</p>
            </div>
            <span className="w-fit rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800">
              {RECOMMENDATION_LABEL[review.comparison.recommendation]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-neutral-100 p-3">
              <p className="text-xs text-neutral-400">Negativas registradas</p>
              <p className="text-xl font-black text-neutral-900">{review.comparison.registeredNegativeCount}</p>
            </div>
            <div className="rounded-lg border border-red-100 bg-red-50 p-3">
              <p className="text-xs text-red-500">Negativas en PDF</p>
              <p className="text-xl font-black text-red-700">{review.comparison.detectedNegativeCount}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-xs text-amber-600">Diferencia</p>
              <p className="text-xl font-black text-amber-700">{review.comparison.difference >= 0 ? '+' : ''}{review.comparison.difference}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs text-blue-600">Posibles nuevas</p>
              <p className="text-xl font-black text-blue-700">{review.comparison.possibleNewAnnotations}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm lg:grid-cols-2">
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Carta vigente</p>
              <p className="mt-1 font-semibold text-neutral-800">{review.comparison.currentLetterType || 'Sin carta vigente'}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Nueva sugerencia</p>
              <p className="mt-1 font-semibold text-neutral-800">{review.comparison.suggestedLetterType || 'Mantener estado actual'}</p>
            </div>
          </div>

          {review.comparison.conflictMessage && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {review.comparison.conflictMessage}
            </div>
          )}
        </section>
      )}

      {review.analysis && (
        <ReviewStep
          studentName={student.full_name}
          course={student.course_name || student.course_id || ''}
          summary={review.summary}
          classification={review.comparison?.suggestedDocType || review.analysis.recommended_letter_type || 'none'}
          fileName={review.file?.name || ''}
          annotations={review.annotations}
          warnings={review.analysis.warnings || []}
          onAnnotationTypeChange={(sequenceNumber, type: ReviewAnnotationType) =>
            review.handleAnnotationTypeChange(sequenceNumber, type)
          }
        />
      )}

      {review.summary && (
        <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => void review.reset()} disabled={review.isBusy} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
            Limpiar revisión
          </button>
          <button type="button" onClick={() => void review.confirmReview()} disabled={review.isBusy || !!review.comparison?.conflictMessage} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" />
            Confirmar actualización
          </button>
        </div>
      )}
    </div>
  );
}