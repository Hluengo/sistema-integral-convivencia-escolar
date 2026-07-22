/** @license SPDX-License-Identifier: Apache-2.0 */

import { useRef, useCallback, useMemo } from 'react';
import { X, Upload, FileText, Plus, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, FileSearch } from 'lucide-react';
import { formatDate, SEVERITY_BADGE, type StudentInfo } from './constants';
import type { CartaDisciplinaria } from '@/src/shared/lib/types';

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  Vigente: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  Pendiente: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Cumplida: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Incumplida: { bg: 'bg-red-100', text: 'text-red-800' },
  Anulada: { bg: 'bg-neutral-100', text: 'text-neutral-500' },
};

const CTA_THRESHOLDS = [
  { min: 5, max: 9, docType: 'amonestacion' as const, label: 'Carta de Amonestación' },
  { min: 10, max: 14, docType: 'compromiso_conductual' as const, label: 'Carta de Compromiso Conductual' },
  { min: 15, max: Infinity, docType: 'derivacion' as const, label: 'Ficha de Derivación' },
];

function getCtaForCount(count: number): (typeof CTA_THRESHOLDS)[number] | null {
  for (const t of CTA_THRESHOLDS) {
    if (count >= t.min && count <= t.max) return t;
  }
  return null;
}

function getNextStepSuggestion(currentLetterType: string | null, negativeCount: number): { label: string; description: string } | null {
  const cta = getCtaForCount(negativeCount);
  if (!cta) return null;

  if (!currentLetterType) {
    return { label: cta.label, description: `El estudiante no tiene carta vigente. Según las ${negativeCount} negativas, corresponde: ${cta.label}.` };
  }

  if (currentLetterType === 'Amonestación Escrita' && cta.docType !== 'amonestacion') {
    return { label: cta.label, description: `Ya tiene Amonestación Escrita vigente. Con ${negativeCount} negativas, sugiere avanzar a: ${cta.label}.` };
  }

  if (currentLetterType === 'Carta de Compromiso Conductual' && (cta.docType === 'derivacion' || cta.docType === 'compromiso_conductual')) {
    return { label: cta.label, description: `Ya tiene Compromiso Conductual vigente. Con ${negativeCount} negativas, sugiere: ${cta.label}.` };
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
  parsedAnnotations: unknown[];
  pdfStoragePath: string | null;
  onViewPdf: (path: string) => void;
  onDrop: (e: React.DragEvent) => Promise<void>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRegisterParsed: () => Promise<void>;
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
  parsedAnnotations,
  pdfStoragePath,
  onViewPdf,
  onDrop,
  onFileSelect,
  onRegisterParsed,
}: RevisionTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLButtonElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, [setIsDragging]);

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

  const parsedNegCount = parsedAnnotations.filter(
    (a: unknown) => (a as { type?: string }).type === 'Negativa'
  ).length;

  const suggestion = currentCarta
    ? getNextStepSuggestion(currentCarta.letter_type, parsedNegCount)
    : parsedNegCount > 0
      ? getNextStepSuggestion(null, parsedNegCount)
      : null;

  return (
    <div className="space-y-5">
      {currentCarta && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-brand-600" />
            <h4 className="font-bold text-neutral-800 text-xs uppercase tracking-wider">Carta Vigente</h4>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-neutral-800 text-sm">
                {currentCarta.letter_type}
              </p>
              <p className="text-neutral-500 text-xs">
                Emitida: {currentCarta.emission_date ? formatDate(currentCarta.emission_date) : '-'}
                {currentCarta.apoderado_name && ` · Apoderado: ${currentCarta.apoderado_name}`}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 font-semibold text-[10px] ${(STATUS_BADGE[currentCarta.status] || STATUS_BADGE.Vigente).bg} ${(STATUS_BADGE[currentCarta.status] || STATUS_BADGE.Vigente).text}`}>
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
          type="file"
          accept=".pdf,application/pdf"
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
                    ? 'Sube un PDF actualizado para comparar con la carta vigente'
                    : 'Sube un PDF de hoja de vida para revisar situación del estudiante'}
                </p>
                <p className="mt-1 text-neutral-400 text-xs">Solo archivos PDF - Máximo 10 MB</p>
              </div>
            </>
          )}
        </div>
      </button>

      {parsingStatus && !isParsing && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            parsingStatus.includes('exitosamente') || parsingStatus.includes('detectaron')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : parsingStatus.includes('Error')
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-neutral-200 bg-neutral-50 text-neutral-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {parsingStatus.includes('exitosamente') || parsingStatus.includes('detectaron') ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : parsingStatus.includes('Error') ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
            )}
            <span>{parsingStatus}</span>
          </div>
        </div>
      )}

      {pdfStoragePath && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-indigo-800 text-sm">PDF cargado correctamente</span>
            </div>
            <button
              type="button"
              onClick={() => onViewPdf(pdfStoragePath)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-xs text-white transition-colors hover:bg-indigo-700"
            >
              <FileSearch className="h-3.5 w-3.5" />
              Ver PDF
            </button>
          </div>
        </div>
      )}

      {suggestion && parsedAnnotations.length > 0 && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-bold text-brand-800 text-sm">Sugerencia de documento</p>
              <p className="mt-1 text-brand-700 text-xs leading-relaxed">{suggestion.description}</p>
            </div>
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

      {parsedAnnotations.length > 0 && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <h3 className="mb-1 flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <FileText className="h-4 w-4 text-brand-600" />
            Anotaciones Detectadas ({parsedAnnotations.length})
          </h3>
          <p className="mb-3 font-medium text-neutral-500 text-xs">
            {(() => {
              const pos = parsedAnnotations.filter((a: unknown) => (a as { type?: string }).type === 'Positiva').length;
              const neg = parsedAnnotations.length - pos;
              return `Se detectaron ${parsedAnnotations.length} anotaciones (${neg} negativas, ${pos} positivas):`;
            })()}
          </p>
          <div className="max-h-72 space-y-3 overflow-y-auto">
            {parsedAnnotations.map((ann: unknown, index: number) => {
              const a = ann as Record<string, string | undefined>;
              const severity = a.severity || 'Leve';
              const badge = SEVERITY_BADGE[severity] || SEVERITY_BADGE.Leve;
              return (
                <div
                  key={a.id || `pdf-ann-${severity}-${a.type || 'Negativa'}-${(a.text || '').slice(0, 40)}`}
                  className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full${badge.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider${badge.bg} ${badge.text}`}>
                        {severity}
                      </span>
                      <span className="font-medium text-[10px] text-neutral-400 uppercase">
                        {a.type || 'Negativa'}
                      </span>
                    </div>
                    <p className="text-neutral-700 text-sm">
                      {a.text || a.observation || 'Sin descripcion'}
                    </p>
                    {a.date && <p className="mt-1 text-neutral-400 text-xs">{formatDate(a.date)}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onRegisterParsed}
            disabled={isParsing || parsedAnnotations.length === 0}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Registrar {parsedAnnotations.length} Anotacione
            {parsedAnnotations.length === 1 ? 'n' : 's'}
          </button>
        </div>
      )}
    </div>
  );
}
