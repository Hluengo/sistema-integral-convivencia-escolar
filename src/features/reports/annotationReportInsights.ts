import type { AnnualAnnotationTrendRecord } from "../../shared/api/services/annotations.service";
import type { AnnotationStageCounts } from "../../shared/lib/domain/annotationStageCounts";
import type { DecisionInsight } from "./reportInsights";

export interface AnnotationReportSummary {
  total: number;
  negative: number;
  positive: number;
  informational: number;
  peakMonth: string | null;
  peakMonthTotal: number;
}

const priorityOrder = { Alta: 0, Media: 1, Baja: 2 } as const;

export function summarizeAnnotations(
  trends: AnnualAnnotationTrendRecord[],
): AnnotationReportSummary {
  const byMonth = new Map<string, number>();
  let negative = 0;
  let positive = 0;
  let informational = 0;

  for (const annotation of trends) {
    const month = annotation.dateTime.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    if (annotation.type === "Negativa") negative += 1;
    else if (annotation.type === "Positiva") positive += 1;
    else informational += 1;
  }

  const peak = [...byMonth.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];
  return {
    total: trends.length,
    negative,
    positive,
    informational,
    peakMonth: peak?.[0] ?? null,
    peakMonthTotal: peak?.[1] ?? 0,
  };
}

export function buildAnnotationDecisionInsights(
  summary: AnnotationReportSummary,
  stages?: AnnotationStageCounts,
): DecisionInsight[] {
  if (summary.total === 0) {
    return [
      {
        priority: "Baja",
        title: "No hay anotaciones en el período escolar consultado",
        evidence: "La tendencia anual no contiene registros.",
        action:
          "Confirma que el período y la carga de registros sean correctos antes de concluir que no existen situaciones.",
        limitation:
          "La ausencia de registros puede reflejar subregistro o una fuente aún no sincronizada.",
      },
    ];
  }

  const insights: DecisionInsight[] = [];
  const negativeShare = summary.negative / summary.total;
  if (negativeShare >= 0.5) {
    insights.push({
      priority: "Media",
      title: "Revisar respuestas formativas y preventivas",
      evidence: `${Math.round(negativeShare * 100)}% de las anotaciones del período son negativas.`,
      action:
        "Analiza con el equipo qué situaciones se repiten y acuerda acciones de aula, reparación y apoyo antes de escalar medidas.",
      limitation:
        "El tipo de anotación depende del criterio de registro y no mide por sí solo el clima escolar ni la conducta de un curso.",
    });
  }

  if (summary.peakMonth && summary.peakMonthTotal > 1) {
    insights.push({
      priority: "Media",
      title: `Concentración de registros en ${summary.peakMonth}`,
      evidence: `${summary.peakMonthTotal} anotaciones corresponden al mes con mayor volumen.`,
      action:
        "Revisa calendario escolar, cambios de rutina y contextos de ese período para planificar prevención y acompañamiento.",
      limitation:
        "Una concentración mensual no demuestra una causa; debe contrastarse con asistencia, actividades y contexto institucional.",
    });
  }

  if (stages) {
    const pending =
      stages.sinCarta.pending +
      stages.amonestacion.pending +
      stages.compromiso.pending +
      stages.derivacion.pending;
    if (pending > 0) {
      insights.push({
        priority: "Alta",
        title: "Dar seguimiento a apoyos aún no procesados",
        evidence: `${pending} registro${pending === 1 ? "" : "s"} aparece${pending === 1 ? "" : "n"} pendiente${pending === 1 ? "" : "s"} de procesamiento en las etapas de apoyo.`,
        action:
          "Revisa la pertinencia del apoyo, registra la actuación realizada y coordina seguimiento; evita que el conteo sea la única base para intervenir.",
        limitation:
          "Pendiente de procesamiento no significa automáticamente falta de apoyo: puede requerir revisión o actualización administrativa.",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      priority: "Baja",
      title: "Mantener revisión periódica del registro",
      evidence: `${summary.total} anotaciones fueron consideradas en el período.`,
      action:
        "Usa esta línea base en reuniones de ciclo y complementa la lectura con observaciones pedagógicas y participación de la comunidad.",
      limitation:
        "Las anotaciones son una fuente parcial y no reemplazan la evaluación integral del bienestar y aprendizaje.",
    });
  }

  return insights.sort(
    (left, right) =>
      priorityOrder[left.priority] - priorityOrder[right.priority],
  );
}
