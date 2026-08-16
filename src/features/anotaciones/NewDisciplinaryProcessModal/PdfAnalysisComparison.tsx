/** @license SPDX-License-Identifier: Apache-2.0 */

import type { AnnotationSummary, DocumentAnalysis } from '@/shared/lib/types';
import { formatChileDateTime } from '@/shared/lib/dateTime';
import { getAnalysisVariation } from './analysisComparison';

interface PdfAnalysisComparisonProps {
  previous: DocumentAnalysis;
  current: AnnotationSummary;
  currentFileName: string;
  currentAnalyzedAt?: string | null;
}

function total(summary: AnnotationSummary): number {
  return summary.negativas + summary.positivas + summary.informativas;
}

function formatVariation(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export default function PdfAnalysisComparison({
  previous,
  current,
  currentFileName,
  currentAnalyzedAt,
}: PdfAnalysisComparisonProps) {
  const previousSummary: AnnotationSummary = {
    negativas: Number(previous.negativas) || 0,
    positivas: Number(previous.positivas) || 0,
    informativas: Number(previous.informativas) || 0,
  };
  const variation = getAnalysisVariation(previousSummary, current);
  const totalVariation = total(current) - total(previousSummary);

  return (
    <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
      <div>
        <h4 className="font-semibold text-indigo-950">Comparación entre los dos PDF</h4>
        <p className="mt-1 text-indigo-800 text-xs">
          La variación compara el contenido clasificado; al confirmar se omiten duplicados.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/80 bg-white p-3">
          <p className="truncate font-semibold text-neutral-800 text-sm" title={previous.file_name}>
            PDF anterior: {previous.file_name}
          </p>
          <p className="mt-1 text-neutral-500 text-xs">
            Analizado {formatChileDateTime(previous.analyzed_at)}
          </p>
          <p className="mt-2 font-semibold text-neutral-900">{total(previousSummary)} en total</p>
          <p className="text-neutral-600 text-xs">
            {previousSummary.negativas} negativas · {previousSummary.positivas} positivas ·{' '}
            {previousSummary.informativas} informativas
          </p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-white p-3">
          <p className="truncate font-semibold text-indigo-950 text-sm" title={currentFileName}>
            PDF nuevo: {currentFileName}
          </p>
          <p className="mt-1 text-indigo-700 text-xs">
            Analizado {formatChileDateTime(currentAnalyzedAt)}
          </p>
          <p className="mt-2 font-semibold text-indigo-950">{total(current)} en total</p>
          <p className="text-indigo-800 text-xs">
            {current.negativas} negativas · {current.positivas} positivas · {current.informativas}{' '}
            informativas
          </p>
        </div>
      </div>

      <p className="rounded-lg bg-indigo-100 px-3 py-2 font-medium text-indigo-900 text-sm">
        Variación del PDF nuevo: {formatVariation(totalVariation)} total (
        {formatVariation(variation.negativas)} negativas · {formatVariation(variation.positivas)}{' '}
        positivas · {formatVariation(variation.informativas)} informativas)
      </p>
    </div>
  );
}
