/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  Info,
  Lightbulb,
  BarChart3,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  Annotation,
  CartaDisciplinaria,
  DocumentAnalysis,
} from "@/shared/lib/types";
import {
  getDisciplinaryStage,
  getNextThreshold,
  getStageProgress,
  getSuggestedLetterType,
  mapDocTypeToLetterType,
} from "@/shared/lib/domain/disciplinaryStage";
import { formatDate, STAGE_STYLE } from "./constants";
import {
  getCartaWorkflowLabel,
  type DetectedAnnotationRecord,
} from "@/shared/api/services/cartas.service";
import Button from "@/shared/ui/Button";

interface StudentSummaryTabProps {
  annotations: Annotation[];
  detectedAnnotations: DetectedAnnotationRecord[];
  counts: { negativas: number; positivas: number; informativas: number };
  currentCarta: CartaDisciplinaria | null;
  lastAnalysis: DocumentAnalysis | null;
  onGoToRevisionTab?: () => void;
  onGoToCartasTab?: () => void;
}

function normalizeCategory(category: string | null | undefined): string {
  const normalized = (category || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalized.includes("respons")) return "RESPONSABILIDAD";
  if (normalized.includes("inform")) return "INFORMATIVA";
  if (normalized.includes("comport") || normalized === "negative") {
    return "COMPORTAMIENTO";
  }
  if (normalized === "positive") return "RESPONSABILIDAD";
  return category?.trim().toUpperCase() || "SIN CATEGORÍA";
}

function normalizeAnnotationText(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function deduplicateDetectedAnnotations(
  annotations: DetectedAnnotationRecord[],
): DetectedAnnotationRecord[] {
  const unique = new Map<string, DetectedAnnotationRecord>();
  annotations.forEach((annotation) => {
    const text = normalizeAnnotationText(
      annotation.raw_text || annotation.annotation_text,
    );
    const date = annotation.annotation_date?.slice(0, 10) || "";
    const key = text ? `${date}|${text}` : annotation.id;
    if (!unique.has(key)) unique.set(key, annotation);
  });
  return [...unique.values()];
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
  annotations,
  detectedAnnotations,
  counts,
  currentCarta,
  lastAnalysis,
  onGoToRevisionTab,
  onGoToCartasTab,
}: StudentSummaryTabProps) {
  const stage = getDisciplinaryStage(counts.negativas);
  const uniqueDetectedAnnotations =
    deduplicateDetectedAnnotations(detectedAnnotations);
  const categoryRows = Object.entries(
    uniqueDetectedAnnotations.reduce<Record<string, number>>(
      (acc, annotation) => {
        const category = normalizeCategory(annotation.category);
        acc[category] = (acc[category] ?? 0) + 1;
        return acc;
      },
      {},
    ),
  )
    .sort(([, first], [, second]) => second - first)
    .slice(0, 5);
  const teacherRows = Object.entries(
    uniqueDetectedAnnotations.reduce<Record<string, number>>(
      (acc, annotation) => {
        const teacher = annotation.teacher_name?.trim();
        if (teacher) acc[teacher] = (acc[teacher] ?? 0) + 1;
        return acc;
      },
      {},
    ),
  )
    .sort(([, first], [, second]) => second - first)
    .slice(0, 3);
  const totalAnnotations = annotations.length;
  const profileText =
    totalAnnotations === 0
      ? "No hay anotaciones disponibles para elaborar un resumen analítico."
      : "Distribución descriptiva basada en los registros cargados.";
  const progress = getStageProgress(counts.negativas);
  const nextThreshold = getNextThreshold(counts.negativas);
  const style = STAGE_STYLE[stage.key];
  const suggestedDocType = getSuggestedLetterType(
    counts.negativas,
    currentCarta?.letter_type,
  );
  const suggestedLetterType = mapDocTypeToLetterType(suggestedDocType);

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">
        <section
          className={`rounded-xl border ${style.border} bg-white p-4 shadow-sm sm:p-5`}
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                    Resumen de anotaciones
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    Registros disciplinarios del estudiante seleccionado.
                  </p>
                </div>
              </div>
            </div>
            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border border-current/10 px-3 py-2 text-xs font-bold ${style.bg} ${style.text}`}
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              {stage.label}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="group relative flex min-h-24 min-w-0 flex-col items-start justify-between rounded-xl border border-gravisima-100 bg-gravisima-50/80 p-3 transition-transform hover:-translate-y-0.5">
              <span
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg border border-gravisima-100 bg-white/70 text-gravisima-600"
                aria-hidden="true"
              >
                <AlertTriangle className="size-5" />
              </span>
              <p className="shrink-0 tabular-nums text-2xl font-black leading-none text-gravisima-700 sm:text-3xl">
                {counts.negativas}
              </p>
              <p className="min-w-0 text-sm font-semibold leading-tight text-gravisima-600">
                Negativas registradas
              </p>
            </div>
            <div className="group relative flex min-h-24 min-w-0 flex-col items-start justify-between rounded-xl border border-leve-100 bg-leve-50/80 p-3 transition-transform hover:-translate-y-0.5">
              <span
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg border border-leve-100 bg-white/70 text-leve-600"
                aria-hidden="true"
              >
                <CheckCircle2 className="size-5" />
              </span>
              <p className="shrink-0 tabular-nums text-2xl font-black leading-none text-leve-700 sm:text-3xl">
                {counts.positivas}
              </p>
              <p className="min-w-0 text-sm font-semibold leading-tight text-leve-600">
                Positivas
              </p>
            </div>
            <div className="group relative flex min-h-24 min-w-0 flex-col items-start justify-between rounded-xl border border-blue-100 bg-blue-50/80 p-3 transition-transform hover:-translate-y-0.5">
              <span
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg border border-blue-100 bg-white/70 text-blue-600"
                aria-hidden="true"
              >
                <Info className="size-5" />
              </span>
              <p className="shrink-0 tabular-nums text-2xl font-black leading-none text-blue-700 sm:text-3xl">
                {counts.informativas}
              </p>
              <p className="min-w-0 text-sm font-semibold leading-tight text-blue-600">
                Informativas
              </p>
            </div>
          </div>
        </section>

        <section className="h-fit self-start rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-brand-600" aria-hidden="true" />
                <h4 className="text-sm font-bold text-neutral-900">
                  Progreso disciplinario
                </h4>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">
                Umbral de gravedad para medida socioeducativa superior
              </p>
            </div>
            <span className="inline-flex items-center rounded bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
              Umbral: {nextThreshold ?? "máximo"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso disciplinario: ${counts.negativas} negativas`}
            className="h-3 overflow-hidden rounded-full bg-neutral-100 p-0.5"
          >
            <div
              className="h-full rounded-full bg-brand-600 transition-[width]"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between gap-3 text-[11px] font-medium text-neutral-500">
            <span>Rango regular (0-5)</span>
            <span className="font-bold text-gravisima-600">
              {nextThreshold === null
                ? "Umbral máximo alcanzado"
                : `Faltan ${progress.remaining} para ${nextThreshold}`}
            </span>
            <span>Crítico (10+)</span>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-2.5 lg:grid-cols-2">
          <section className="h-fit self-start rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <h4 className="text-sm font-bold text-neutral-900">
                Carta y estado del trámite
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
                className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-brand-200 px-3.5 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Ir a Carta{" "}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </section>

          <section className="h-fit self-start rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <h4 className="text-sm font-bold text-neutral-900">
                Análisis más reciente del PDF
              </h4>
            </div>
            {lastAnalysis ? (
              <div className="space-y-0.5 text-xs leading-5 text-neutral-600">
                <p className="font-semibold text-neutral-900">
                  {lastAnalysis.file_name || "Documento sin nombre"}
                </p>
                <p>{formatDate(lastAnalysis.analyzed_at)}</p>
                <p>
                  Conteos del análisis: {lastAnalysis.negativas} negativas ·{" "}
                  {lastAnalysis.positivas} positivas ·{" "}
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
                className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-brand-200 px-3.5 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                Revisar nuevo PDF{" "}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </section>
        </div>
      </div>

      <aside className="space-y-4 lg:col-span-4">
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 text-brand-700">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold text-neutral-900">
              Siguiente acción sugerida
            </h3>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-neutral-600">
            {getActionText(counts.negativas, currentCarta)}
          </p>
          {suggestedLetterType && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-xs font-medium text-neutral-600">
              <Clock3
                className="mt-0.5 size-4 shrink-0 text-gravisima-600"
                aria-hidden="true"
              />
              <span>Documento sugerido: {suggestedLetterType}</span>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <h3 className="text-sm font-bold text-neutral-900">
              Desglose de registros
            </h3>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-neutral-600">
            {profileText}
          </p>

          <div className="mt-5 border-t border-neutral-100 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              Categorías detectadas en PDF
            </p>
            <div className="mt-3 space-y-2">
              {categoryRows.length > 0 ? (
                categoryRows.map(([category, count]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="truncate text-neutral-600">
                      {category}
                    </span>
                    <span className="font-bold tabular-nums text-neutral-900">
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500">
                  Sin categorías detectadas.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 border-t border-neutral-100 pt-4">
            <div className="flex items-center gap-2">
              <Users
                className="h-3.5 w-3.5 text-neutral-500"
                aria-hidden="true"
              />
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                Docentes con más anotaciones
              </p>
            </div>
            {teacherRows.length > 0 ? (
              <div className="mt-3 space-y-2">
                {teacherRows.map(([teacher, count]) => (
                  <div
                    key={teacher}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="truncate text-neutral-600">{teacher}</span>
                    <span className="font-bold tabular-nums text-neutral-900">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-neutral-500">
                Sin docente detectado.
              </p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
