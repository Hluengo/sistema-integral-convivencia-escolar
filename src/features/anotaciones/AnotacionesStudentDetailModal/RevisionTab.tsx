/** @license SPDX-License-Identifier: Apache-2.0 */

import { useRef, useCallback, useMemo } from 'react';
import { X, FileText, AlertTriangle, RefreshCw, ArrowRight, Trash2 } from 'lucide-react';
import { formatDate, type StudentInfo } from './constants';
import type { CartaDisciplinaria, AnnotationSummary } from '@/src/shared/lib/types';

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  Vigente: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  Pendiente: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Cumplida: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Incumplida: { bg: 'bg-red-100', text: 'text-red-800' },
  Anulada: { bg: 'bg-neutral-100', text: 'text-neutral-500' },
};

const CTA_THRESHOLDS = [
  { min: 5, max: 9, docType: 'amonestacion' as const, label: 'Carta de Amonestación' },
  {
    min: 10,
    max: 14,
    docType: 'compromiso_conductual' as const,
    label: 'Carta de Compromiso Conductual',
  },
  { min: 15, max: Infinity, docType: 'derivacion' as const, label: 'Ficha de Derivación' },
];

function getCtaForCount(count: number): (typeof CTA_THRESHOLDS)[number] | null {
  for (const t of CTA_THRESHOLDS) {
    if (count >= t.min && count <= t.max) return t;
  }
  return null;
}

function getNextStepSuggestion(
  currentLetterType: string | null,
  negativeCount: number
): { label: string; description: string } | null {
  const cta = getCtaForCount(negativeCount);
  if (!cta) return null;

  if (!currentLetterType) {
    return {
      label: cta.label,
      description: `El estudiante no tiene carta vigente. Según las ${negativeCount} negativas, corresponde: ${cta.label}.`,
    };
  }

  if (currentLetterType === 'Amonestación Escrita' && cta.docType !== 'amonestacion') {
    return {
      label: cta.label,
      description: `Ya tiene Amonestación Escrita vigente. Con ${negativeCount} negativas, sugiere avanzar a: ${cta.label}.`,
    };
  }

  if (
    currentLetterType === 'Carta de Compromiso Conductual' &&
    (cta.docType === 'derivacion' || cta.docType === 'compromiso_conductual')
  ) {
    return {
      label: cta.label,
      description: `Ya tiene Compromiso Conductual vigente. Con ${negativeCount} negativas, sugiere: ${cta.label}.`,
    };
  }

  return null;
}

interface RevisionTabProps {
  student: StudentInfo;
  cartas: CartaDisciplinaria[];
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isParsing: boolean;
  parsingStatus: string;
  errorMessage: string | null;
  setErrorMessage: (v: string | null) => void;
  summary: AnnotationSummary | null;
  dbNegativeCount: number;
  onDrop: (e: React.DragEvent) => Promise<void>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  clearAnalysis: () => Promise<void>;
  onClearAll: () => void;
}

export default function RevisionTab({
  student,
  cartas,
  isDragging,
  setIsDragging,
  isParsing,
  parsingStatus,
  errorMessage,
  setErrorMessage,
  summary,
  dbNegativeCount,
  onDrop,
  onFileSelect,
  clearAnalysis,
  onClearAll,
}: RevisionTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLButtonElement>(null);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [setIsDragging]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
      }
    },
    [setIsDragging]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const currentCarta = useMemo(() => {
    const vigentes = cartas.filter((c) => c.status === 'Vigente');
    if (vigentes.length > 0) {
      return vigentes.reduce((a, b) =>
        new Date(a.emission_date) > new Date(b.emission_date) ? a : b
      );
    }
    return cartas.length > 0 ? cartas[0] : null;
  }, [cartas]);

  const parsedNegCount = summary?.negativas ?? 0;
  const effectiveNegCount = Math.max(dbNegativeCount, parsedNegCount);
  const total = summary ? summary.negativas + summary.positivas + summary.informativas : 0;

  const suggestion = currentCarta
    ? getNextStepSuggestion(currentCarta.letter_type, effectiveNegCount)
    : effectiveNegCount > 0
      ? getNextStepSuggestion(null, effectiveNegCount)
      : null;

  return (
    <div className="space-y-5">
      {currentCarta && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-brand-600" />
            <h4 className="font-bold text-neutral-800 text-xs uppercase tracking-wider">
              Carta Vigente
            </h4>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-neutral-800 text-sm">{currentCarta.letter_type}</p>
              <p className="text-neutral-500 text-xs">
                Emitida: {currentCarta.emission_date ? formatDate(currentCarta.emission_date) : '-'}
                {currentCarta.apoderado_name && ` · Apoderado: ${currentCarta.apoderado_name}`}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 font-semibold text-[10px] ${(STATUS_BADGE[currentCarta.status] || STATUS_BADGE.Vigente).bg} ${(STATUS_BADGE[currentCarta.status] || STATUS_BADGE.Vigente).text}`}
            >
              {currentCarta.status}
            </span>
          </div>
        </div>
      )}

      <button
        ref={dropZoneRef}
        type="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200 ${
          isDragging
            ? 'border-brand-400 bg-brand-50/50 shadow-lg'
            : 'border-neutral-300 bg-white hover:border-brand-300 hover:bg-brand-50/20'
        } ${isParsing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          aria-label="Seleccionar archivo para analizar"
          type="file"
          accept=".pdf,.md,application/pdf"
          onChange={onFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          {isParsing ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              </div>
              <p className="font-medium text-brand-600 text-sm">{parsingStatus}</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <RefreshCw className="h-6 w-6 text-neutral-400" />
              </div>
              <div>
                <p className="font-medium text-neutral-700 text-sm">
                  {currentCarta
                    ? 'Sube un PDF o Markdown (.md) actualizado para comparar con la carta vigente'
                    : 'Sube un PDF o Markdown (.md) de hoja de vida para analizar las anotaciones del estudiante'}
                </p>
                <p className="mt-1 text-neutral-400 text-xs">PDF y Markdown (.md) - Máximo 10 MB</p>
              </div>
            </>
          )}
        </div>
      </button>

      {parsingStatus && !isParsing && summary && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <h3 className="mb-1 flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <FileText className="h-4 w-4 text-brand-600" />
            Anotaciones Detectadas ({total})
          </h3>
          <p className="mb-3 font-medium text-neutral-500 text-xs">
            {(() => {
              const parts = [`${summary.negativas} negativas`, `${summary.positivas} positivas`];
              if (summary.informativas > 0) parts.push(`${summary.informativas} informativas`);
              return `Se detectaron ${total} anotaciones (${parts.join(', ')}):`;
            })()}
          </p>

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

          <button
            type="button"
            onClick={clearAnalysis}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 font-medium text-neutral-500 text-sm transition-colors hover:bg-neutral-50 hover:text-neutral-700"
          >
            <X className="h-4 w-4" />
            Limpiar análisis
          </button>
        </div>
      )}

      {parsingStatus && !isParsing && !summary && !errorMessage && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-neutral-600 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-neutral-500" />
            <span>{parsingStatus}</span>
          </div>
        </div>
      )}

      {suggestion && summary && total > 0 && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-bold text-brand-800 text-sm">Sugerencia de documento</p>
              <p className="mt-1 text-brand-700 text-xs leading-relaxed">
                {suggestion.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {(dbNegativeCount > 0 || summary) && (
        <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-neutral-800 text-xs uppercase tracking-wider">
                Empezar de cero
              </p>
              <p className="mt-0.5 text-neutral-500 text-xs">
                {dbNegativeCount > 0
                  ? `Elimina ${dbNegativeCount} anotaciones registradas y el último análisis de IA.`
                  : `Elimina el último análisis de IA para este estudiante.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `¿Eliminar TODAS las anotaciones de ${student.full_name} y reiniciar el análisis? Esta acción no se puede deshacer.`
                  )
                ) {
                  onClearAll();
                }
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-600 text-xs transition-colors hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar registros
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
            <button
              type="button"
              aria-label="Cerrar mensaje"
              onClick={() => setErrorMessage(null)}
              className="ml-auto shrink-0 text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
