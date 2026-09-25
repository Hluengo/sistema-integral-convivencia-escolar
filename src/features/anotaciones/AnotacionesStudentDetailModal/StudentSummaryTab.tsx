/** @license SPDX-License-Identifier: Apache-2.0 */

import { ArrowRight, FileText, Gauge, Shield, Sparkles } from "lucide-react";
import type { CartaDisciplinaria, DocumentAnalysis } from "@/shared/lib/types";
import {
  getDisciplinaryStage,
  getNextThreshold,
  getStageProgress,
  getSuggestedLetterType,
  mapDocTypeToLetterType,
} from "@/shared/lib/domain/disciplinaryStage";
import { formatDate, STAGE_STYLE } from "./constants";
import { getCartaWorkflowLabel } from "@/shared/api/services/cartas.service";
import Button from "@/shared/ui/Button";

interface StudentSummaryTabProps {
  counts: { negativas: number; positivas: number; informativas: number };
  currentCarta: CartaDisciplinaria | null;
  lastAnalysis: DocumentAnalysis | null;
  onGoToRevisionTab?: () => void;
  onGoToCartasTab?: () => void;
}

function getActionText(
  negativeCount: number,
  currentCarta: CartaDisciplinaria | null,
): string {
  const suggested = getSuggestedLetterType(
    negativeCount,
    currentCarta?.letter_type,
  );
  if (!suggested) {
    if (negativeCount < 5)
      return "Mantener seguimiento regular. No corresponde emitir carta disciplinaria.";
    return "Mantener la carta vigente y seguimiento del estudiante.";
  }
  const letterType = mapDocTypeToLetterType(suggested);
  if (suggested === "derivacion") return `Escalar a ${letterType}.`;
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
  const suggestedDocType = getSuggestedLetterType(
    counts.negativas,
    currentCarta?.letter_type,
  );
  const suggestedLetterType = mapDocTypeToLetterType(suggestedDocType);

  return (
    <div className="space-y-3">
      <section
        className={`rounded-xl border ${style.border} bg-white p-3 shadow-xs`}
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-semibold text-neutral-600 text-xs">
              Resumen de anotaciones
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Registros disciplinarios del estudiante seleccionado.
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${style.bg} ${style.text}`}
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            {stage.label}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-gravisima-100 bg-gravisima-50 p-2.5">
            <p className="shrink-0 tabular-nums text-lg font-black leading-none text-gravisima-700">
              {counts.negativas}
            </p>
            <p className="min-w-0 text-xs font-semibold leading-tight text-gravisima-600">
              Negativas registradas
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-leve-100 bg-leve-50 p-2.5">
            <p className="shrink-0 tabular-nums text-lg font-black leading-none text-leve-700">
              {counts.positivas}
            </p>
            <p className="min-w-0 text-xs font-semibold leading-tight text-leve-600">
              Positivas
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2.5">
            <p className="shrink-0 tabular-nums text-lg font-black leading-none text-blue-700">
              {counts.informativas}
            </p>
            <p className="min-w-0 text-xs font-semibold leading-tight text-blue-600">
              Informativas
            </p>
          </div>
        </div>
      </section>

      <section className="h-fit self-start rounded-lg border border-neutral-200 bg-white p-2.5 shadow-xs">
        <div className="mb-2 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <h4 className="text-sm font-bold text-neutral-900">
            Progreso disciplinario
          </h4>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso disciplinario: ${counts.negativas} negativas`}
          className="h-2.5 overflow-hidden rounded-full bg-neutral-100"
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width]"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-neutral-500">
          <span>{counts.negativas} negativas</span>
          <span>
            {nextThreshold === null
              ? "Umbral máximo alcanzado"
              : `Faltan ${progress.remaining} para ${nextThreshold}`}
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <section className="h-fit self-start rounded-lg border border-neutral-200 bg-white p-2.5 shadow-xs">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h4 className="text-sm font-bold text-neutral-900">
              Carta vigente y trámite
            </h4>
          </div>
          {currentCarta ? (
            <div className="space-y-0.5 text-xs leading-5 text-neutral-600">
              <p className="font-semibold text-neutral-900">
                {currentCarta.letter_type}
              </p>
              <p>
                Registro:{" "}
                {formatDate(
                  currentCarta.created_at || currentCarta.emission_date,
                )}
              </p>
              <p>Apoderado: {currentCarta.apoderado_name || "-"}</p>
              <p>Estado del trámite: {getCartaWorkflowLabel(currentCarta)}</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              No hay carta vigente registrada en Supabase.
            </p>
          )}
          {onGoToCartasTab && (
            <Button
              variant="custom"
              onClick={onGoToCartasTab}
              className="mt-2 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              Ir a Carta{" "}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </section>

        <section className="h-fit self-start rounded-lg border border-neutral-200 bg-white p-2.5 shadow-xs">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h4 className="text-sm font-bold text-neutral-900">
              Último análisis PDF
            </h4>
          </div>
          {lastAnalysis ? (
            <div className="space-y-0.5 text-xs leading-5 text-neutral-600">
              <p className="font-semibold text-neutral-900">
                {lastAnalysis.file_name || "Documento sin nombre"}
              </p>
              <p>{formatDate(lastAnalysis.analyzed_at)}</p>
              <p>
                {lastAnalysis.negativas} negativas · {lastAnalysis.positivas}{" "}
                positivas · {lastAnalysis.informativas} informativas
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
              className="mt-2 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              Revisar nuevo PDF{" "}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-brand-200 bg-brand-50 p-2.5 shadow-xs">
        <p className="font-semibold text-brand-800 text-xs">
          Siguiente acción sugerida
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-brand-900">
          {getActionText(counts.negativas, currentCarta)}
        </p>
        {suggestedLetterType && (
          <p className="mt-1 text-xs text-brand-700">
            Documento sugerido: {suggestedLetterType}
          </p>
        )}
      </section>
    </div>
  );
}
