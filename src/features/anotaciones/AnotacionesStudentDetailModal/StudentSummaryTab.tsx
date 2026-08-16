/** @license SPDX-License-Identifier: Apache-2.0 */

import { ArrowRight, FileText, Gauge, Shield, Sparkles } from 'lucide-react';
import type { CartaDisciplinaria, DocumentAnalysis } from '@/shared/lib/types';
import {
  getDisciplinaryStage,
  getNextThreshold,
  getStageProgress,
  getSuggestedLetterType,
  mapDocTypeToLetterType,
} from '@/shared/lib/domain/disciplinaryStage';
import { formatDate, STAGE_STYLE } from './constants';
import { getCartaWorkflowLabel } from '@/shared/api/services/cartas.service';
import Button from '@/shared/ui/Button';

interface StudentSummaryTabProps {
  counts: { negativas: number; positivas: number; informativas: number };
  currentCarta: CartaDisciplinaria | null;
  lastAnalysis: DocumentAnalysis | null;
  onGoToRevisionTab?: () => void;
  onGoToCartasTab?: () => void;
}

function getActionText(negativeCount: number, currentCarta: CartaDisciplinaria | null): string {
  const suggested = getSuggestedLetterType(negativeCount, currentCarta?.letter_type);
  if (!suggested) {
    if (negativeCount < 5)
      return 'Mantener seguimiento regular. No corresponde emitir carta disciplinaria.';
    return 'Mantener la carta vigente y seguimiento del estudiante.';
  }
  const letterType = mapDocTypeToLetterType(suggested);
  if (suggested === 'derivacion') return `Escalar a ${letterType}.`;
  return `Tramitar ${letterType}.`;
}

export default function StudentSummaryTab({
  counts,
  currentCarta,
  lastAnalysis,
  onGoToRevisionTab,
  onGoToCartasTab,
}: StudentSummaryTabProps) {
  const stage = getDisciplinaryStage(counts.negativas);
  const progress = getStageProgress(counts.negativas);
  const nextThreshold = getNextThreshold(counts.negativas);
  const style = STAGE_STYLE[stage.key];
  const suggestedDocType = getSuggestedLetterType(counts.negativas, currentCarta?.letter_type);
  const suggestedLetterType = mapDocTypeToLetterType(suggestedDocType);

  return (
    <div className="space-y-5">
      <section className={`rounded-xl border ${style.border} bg-white p-5 shadow-xs`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Resumen de anotaciones
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Registros disciplinarios del estudiante seleccionado.
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${style.bg} ${style.text}`}
          >
            <Shield className="h-4 w-4" />
            {stage.label}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gravisima-100 bg-gravisima-50 p-4">
            <p className="text-2xl font-black text-gravisima-700">{counts.negativas}</p>
            <p className="text-xs font-semibold text-gravisima-600">Negativas registradas</p>
          </div>
          <div className="rounded-lg border border-leve-100 bg-leve-50 p-4">
            <p className="text-2xl font-black text-leve-700">{counts.positivas}</p>
            <p className="text-xs font-semibold text-leve-600">Positivas</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-2xl font-black text-blue-700">{counts.informativas}</p>
            <p className="text-xs font-semibold text-blue-600">Informativas</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-brand-600" />
          <h4 className="text-sm font-bold text-neutral-900">Progreso disciplinario</h4>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width]"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-neutral-500">
          <span>{counts.negativas} negativas</span>
          <span>
            {nextThreshold === null
              ? 'Umbral máximo alcanzado'
              : `Faltan ${progress.remaining} para ${nextThreshold}`}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-600" />
            <h4 className="text-sm font-bold text-neutral-900">Carta vigente y trámite</h4>
          </div>
          {currentCarta ? (
            <div className="space-y-1 text-sm text-neutral-600">
              <p className="font-semibold text-neutral-900">{currentCarta.letter_type}</p>
              <p>Registro: {formatDate(currentCarta.created_at || currentCarta.emission_date)}</p>
              <p>Apoderado: {currentCarta.apoderado_name || '-'}</p>
              <p>Estado del trámite: {getCartaWorkflowLabel(currentCarta)}</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No hay carta vigente registrada en Supabase.</p>
          )}
          {onGoToCartasTab && (
            <Button
              variant="custom"
              onClick={onGoToCartasTab}
              className="mt-4 rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              Ir a Carta <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-neutral-900">Último análisis PDF</h4>
          </div>
          {lastAnalysis ? (
            <div className="space-y-1 text-sm text-neutral-600">
              <p className="font-semibold text-neutral-900">
                {lastAnalysis.file_name || 'Documento sin nombre'}
              </p>
              <p>{formatDate(lastAnalysis.analyzed_at)}</p>
              <p>
                {lastAnalysis.negativas} negativas · {lastAnalysis.positivas} positivas ·{' '}
                {lastAnalysis.informativas} informativas
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              No hay análisis PDF registrado para este estudiante.
            </p>
          )}
          {onGoToRevisionTab && (
            <Button
              variant="custom"
              onClick={onGoToRevisionTab}
              className="mt-4 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Revisar nuevo PDF <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-brand-200 bg-brand-50 p-5 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          Siguiente acción sugerida
        </p>
        <p className="mt-2 text-sm font-semibold text-brand-900">
          {getActionText(counts.negativas, currentCarta)}
        </p>
        {suggestedLetterType && (
          <p className="mt-1 text-xs text-brand-700">Documento sugerido: {suggestedLetterType}</p>
        )}
      </section>
    </div>
  );
}
