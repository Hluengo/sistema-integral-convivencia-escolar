import { getFaseForEstado } from "../../shared/lib/data";
import { EstadoCausa, type Causa } from "../../shared/lib/types";

export type InsightPriority = "Alta" | "Media" | "Baja";

export interface DecisionInsight {
  priority: InsightPriority;
  title: string;
  evidence: string;
  action: string;
  limitation: string;
}

const priorityOrder: Record<InsightPriority, number> = {
  Alta: 0,
  Media: 1,
  Baja: 2,
};

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function buildDecisionInsights(causas: Causa[]): DecisionInsight[] {
  if (causas.length === 0) {
    return [
      {
        priority: "Baja",
        title: "No hay evidencia suficiente en el filtro actual",
        evidence: "El filtro no contiene expedientes para analizar.",
        action:
          "Amplía el período o quita filtros antes de tomar decisiones institucionales.",
        limitation:
          "Una vista vacía no significa ausencia de situaciones en el establecimiento.",
      },
    ];
  }

  const critical = causas.filter(
    (causa) =>
      causa.comprometeAulaSegura &&
      causa.estadoActual !== EstadoCausa.CAUSA_CERRADA,
  ).length;
  const pendingProcedural = causas.reduce(
    (total, causa) =>
      total +
      causa.checklistDebidoProceso.filter((item) => !item.completado).length,
    0,
  );
  const highSeverity = causas.filter((causa) =>
    ["Muy Grave", "Gravísima"].includes(causa.tipoInfraccion),
  ).length;
  const byCourse = new Map<string, number>();
  for (const causa of causas) {
    byCourse.set(
      causa.estudianteCurso,
      (byCourse.get(causa.estudianteCurso) ?? 0) + 1,
    );
  }
  const leadingCourse = [...byCourse.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];
  const byPhase = new Map<string, number>();
  for (const causa of causas) {
    const phase = getFaseForEstado(causa.estadoActual);
    byPhase.set(phase, (byPhase.get(phase) ?? 0) + 1);
  }
  const leadingPhase = [...byPhase.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];

  const insights: DecisionInsight[] = [];

  if (critical > 0) {
    insights.push({
      priority: "Alta",
      title: "Revisar primero los casos de atención crítica",
      evidence: `${pluralize(critical, "caso")} activo${critical === 1 ? "" : "s"} marcado${critical === 1 ? "" : "s"} como Aula Segura.`,
      action:
        "Realiza una revisión coordinada de medidas de protección, plazos y responsables; registra los acuerdos y próximos hitos.",
      limitation:
        "La marca orienta la priorización operativa y no reemplaza la evaluación del equipo ni el debido proceso.",
    });
  }

  if (pendingProcedural > 0) {
    insights.push({
      priority: "Alta",
      title: "Cerrar brechas de seguimiento procedimental",
      evidence: `${pluralize(pendingProcedural, "hito")} de debido proceso pendiente${pendingProcedural === 1 ? "" : "s"} en el filtro.`,
      action:
        "Asigna responsables y fechas para los hitos pendientes; revisa especialmente los casos próximos a vencer.",
      limitation:
        "Un hito pendiente puede requerir actualización documental, no necesariamente indicar incumplimiento.",
    });
  }

  if (leadingCourse && leadingCourse[1] > 1) {
    insights.push({
      priority: "Media",
      title: `Observar patrones en ${leadingCourse[0]}`,
      evidence: `${pluralize(leadingCourse[1], "expediente")} del filtro corresponde${leadingCourse[1] === 1 ? "" : "n"} a ese curso.`,
      action:
        "Convoca al equipo de convivencia y al profesor jefe para revisar factores contextuales y acordar acciones preventivas, sin etiquetar al curso.",
      limitation:
        "La concentración de registros no prueba una causa ni permite comparar cursos sin considerar matrícula, exposición y calidad del registro.",
    });
  }

  if (highSeverity > 0) {
    insights.push({
      priority: "Media",
      title: "Fortalecer apoyos y prevención focalizada",
      evidence: `${pluralize(highSeverity, "expediente")} corresponde${highSeverity === 1 ? "" : "n"} a gravedad Muy Grave o Gravísima.`,
      action:
        "Verifica medidas de protección, apoyos pedagógicos y coordinación con las redes pertinentes, según cada caso.",
      limitation:
        "La gravedad registrada es una clasificación administrativa y no constituye un diagnóstico de estudiantes o comunidades.",
    });
  }

  if (leadingPhase) {
    insights.push({
      priority: "Baja",
      title: `La mayor carga está en ${leadingPhase[0]}`,
      evidence: `${pluralize(leadingPhase[1], "expediente")} se encuentra${leadingPhase[1] === 1 ? "" : "n"} en esa fase.`,
      action:
        "Planifica una revisión breve de capacidad y tiempos en esa fase para evitar acumulación y distribuir apoyos.",
      limitation:
        "El volumen de expedientes no mide por sí solo complejidad, carga laboral ni resultados educativos.",
    });
  }

  return insights.sort(
    (left, right) =>
      priorityOrder[left.priority] - priorityOrder[right.priority],
  );
}
