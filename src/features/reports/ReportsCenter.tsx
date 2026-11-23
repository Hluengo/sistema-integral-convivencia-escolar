/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileBarChart, History, RefreshCw } from "lucide-react";
import type { Causa, TipoInfraccion } from "../../shared/lib/types";
import Button from "../../shared/ui/Button";
import SummaryCard from "../../shared/ui/SummaryCard";
import Input from "../../shared/ui/Input";
import PageHeader from "../../shared/ui/PageHeader";
import Select from "../../shared/ui/Select";
import {
  TrendChart,
  type ChartSeriesItem,
  type TrendChartPoint,
} from "../../shared/ui/charts";
import { formatChileDateTime } from "../../shared/lib/dateTime";
import { useAuthStore } from "../../shared/lib/stores/authStore";
import {
  fetchAnnualAnnotationTrends,
  fetchAnnotationStageCounts,
} from "../../shared/api/services/annotations.service";
import { fetchUsageStats } from "../../shared/api/services/admin.service";
import { getCurrentSchoolYear } from "../../shared/lib/dateUtils";
import {
  createReportHistory,
  fetchReportHistory,
  type ReportFilters,
} from "../../shared/api/services/reports.service";
import { buildDecisionInsights, type DecisionInsight } from "./reportInsights";
import {
  buildAnnotationDecisionInsights,
  summarizeAnnotations,
} from "./annotationReportInsights";
import { getStats } from "../../shared/lib/data";
import {
  buildReportFileName,
  buildReportSheet,
  filterReportCausas,
} from "./reportUtils";

const EMPTY_FILTERS: ReportFilters = {
  course: "",
  fromDate: "",
  toDate: "",
  status: "",
  responsible: "",
};
const SEVERITY_ORDER: TipoInfraccion[] = [
  "Leve",
  "Grave",
  "Muy Grave",
  "Gravísima",
];
const SEVERITY_COLORS: Record<TipoInfraccion, string> = {
  Leve: "bg-leve-500",
  Grave: "bg-grave-500",
  "Muy Grave": "bg-muygrave-500",
  Gravísima: "bg-gravisima-500",
};

function buildSeverityTrendPoints(causas: Causa[]): TrendChartPoint[] {
  const total = Math.max(1, causas.length);
  const counts = new Map<TipoInfraccion, number>(
    SEVERITY_ORDER.map((severity) => [severity, 0]),
  );
  for (const causa of causas) {
    counts.set(
      causa.tipoInfraccion,
      (counts.get(causa.tipoInfraccion) ?? 0) + 1,
    );
  }

  return SEVERITY_ORDER.map((severity) => {
    const value = counts.get(severity) ?? 0;
    const share = Math.round((value / total) * 100);
    return {
      key: severity,
      label: severity,
      series: [
        { label: severity, value, className: SEVERITY_COLORS[severity] },
      ],
      primary: `${value} expediente${value === 1 ? "" : "s"}`,
      secondary: `${share}%`,
      isObserved: true,
      isCurrent: value > 0,
    };
  });
}

function buildSeverityLegend(points: TrendChartPoint[]): ChartSeriesItem[] {
  return points
    .map((point) => point.series[0])
    .filter((item) => item.value > 0);
}

export default function ReportsCenter({ causas }: { causas: Causa[] }) {
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const [reportScope, setReportScope] = useState<"expedientes" | "anotaciones">(
    "expedientes",
  );
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((state) => state.tenantId);
  const history = useQuery({
    queryKey: ["reports", "history", tenantId],
    queryFn: fetchReportHistory,
    enabled: Boolean(tenantId),
  });
  const usage = useQuery({
    queryKey: ["reports", "usage", tenantId],
    queryFn: fetchUsageStats,
    enabled: Boolean(tenantId),
    retry: false,
  });
  const annotationTrend = useQuery({
    queryKey: [
      "reports",
      "annotations",
      "trend",
      tenantId,
      getCurrentSchoolYear(),
    ],
    queryFn: () =>
      fetchAnnualAnnotationTrends(getCurrentSchoolYear(), tenantId),
    enabled: Boolean(tenantId),
    retry: false,
  });
  const annotationStages = useQuery({
    queryKey: ["reports", "annotations", "stages", tenantId],
    queryFn: fetchAnnotationStageCounts,
    enabled: Boolean(tenantId),
    retry: false,
  });
  const filtered = useMemo(
    () => filterReportCausas(causas, filters),
    [causas, filters],
  );
  const dashboardStats = useMemo(() => getStats(filtered), [filtered]);
  const severityTrendPoints = useMemo(
    () => buildSeverityTrendPoints(filtered),
    [filtered],
  );
  const severityLegend = useMemo(
    () => buildSeverityLegend(severityTrendPoints),
    [severityTrendPoints],
  );
  const decisionInsights = useMemo(
    () => buildDecisionInsights(filtered),
    [filtered],
  );
  const annotationSummary = useMemo(
    () => summarizeAnnotations(annotationTrend.data ?? []),
    [annotationTrend.data],
  );
  const annotationInsights = useMemo(
    () =>
      buildAnnotationDecisionInsights(annotationSummary, annotationStages.data),
    [annotationSummary, annotationStages.data],
  );
  const usageSummary = useMemo(() => {
    if (!usage.data) return null;
    const totalEvents = usage.data.events.reduce(
      (total, event) => total + event.total_count,
      0,
    );
    const activeUsers = usage.data.dailyActiveUsers.map(
      (item) => item.active_users,
    );
    const peakActiveUsers = Math.max(0, ...activeUsers);
    const latestActiveUsers =
      usage.data.dailyActiveUsers.at(-1)?.active_users ?? 0;
    const topEvent = [...usage.data.events].sort(
      (left, right) => right.total_count - left.total_count,
    )[0];
    return {
      totalEvents,
      activeDays: usage.data.dailyActiveUsers.length,
      peakActiveUsers,
      latestActiveUsers,
      topEvent,
    };
  }, [usage.data]);
  const dueProcessPending = filtered.reduce(
    (total, causa) =>
      total +
      causa.checklistDebidoProceso.filter((item) => !item.completado).length,
    0,
  );
  const courses = useMemo(
    () => [...new Set(causas.map((causa) => causa.estudianteCurso))].sort(),
    [causas],
  );
  const responsibles = useMemo(
    () => [...new Set(causas.map((causa) => causa.responsable))].sort(),
    [causas],
  );
  const exportMutation = useMutation({
    mutationFn: async () => {
      const generatedAt = new Date();
      const fileName = buildReportFileName(generatedAt);
      const { default: writeExcelFile } =
        await import("write-excel-file/browser");
      await writeExcelFile(
        buildReportSheet(
          filtered,
          generatedAt,
          decisionInsights,
          annotationInsights,
        ),
        {
          sheet: "Expedientes",
          columns: [
            { width: 20 },
            { width: 20 },
            { width: 38 },
            { width: 24 },
            { width: 14 },
            { width: 14 },
            { width: 20 },
          ],
        },
      ).toFile(fileName);
      await createReportHistory({
        reportType: "expedientes",
        filters,
        rowCount: filtered.length,
        fileName,
      });
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["reports", "history", tenantId],
      }),
  });
  const setFilter = (key: keyof ReportFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Reportes · Gestión institucional"
        title="Centro de reportes"
        description="Dashboard, expedientes y métricas con filtros auditables."
        action={
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Download className="size-4" aria-hidden="true" />{" "}
            {exportMutation.isPending ? "Generando…" : "Exportar informe"}
          </Button>
        }
      />

      <div
        className="inline-flex rounded-xl border border-neutral-200 bg-neutral-100 p-1"
        role="group"
        aria-label="Tipo de reporte"
      >
        {[
          ["expedientes", "Expedientes"],
          ["anotaciones", "Anotaciones"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              setReportScope(value as "expedientes" | "anotaciones")
            }
            aria-pressed={reportScope === value}
            className={`rounded-lg px-4 py-2 font-semibold text-sm transition ${
              reportScope === value
                ? "bg-white text-brand-700 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {reportScope === "expedientes" ? (
        <>
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-200/70 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
            <Select
              value={filters.course}
              onChange={(event) => setFilter("course", event.target.value)}
              aria-label="Curso"
            >
              <option value="">Todos los cursos</option>
              {courses.map((course) => (
                <option key={course}>{course}</option>
              ))}
            </Select>
            <Input
              type="date"
              aria-label="Desde"
              value={filters.fromDate}
              onChange={(event) => setFilter("fromDate", event.target.value)}
            />
            <Input
              type="date"
              aria-label="Hasta"
              value={filters.toDate}
              onChange={(event) => setFilter("toDate", event.target.value)}
            />
            <Select
              value={filters.status}
              onChange={(event) => setFilter("status", event.target.value)}
              aria-label="Estado"
            >
              <option value="">Todos los estados</option>
              {[...new Set(causas.map((causa) => causa.estadoActual))]
                .sort()
                .map((status) => (
                  <option key={status}>{status}</option>
                ))}
            </Select>
            <Select
              value={filters.responsible}
              onChange={(event) => setFilter("responsible", event.target.value)}
              aria-label="Responsable"
            >
              <option value="">Todos los responsables</option>
              {responsibles.map((responsible) => (
                <option key={responsible}>{responsible}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              icon={FileBarChart}
              label="Expedientes filtrados"
              value={String(filtered.length)}
            />
            <SummaryCard
              icon={FileBarChart}
              label="Cursos involucrados"
              value={String(
                new Set(filtered.map((causa) => causa.estudianteCurso)).size,
              )}
            />
            <SummaryCard
              icon={FileBarChart}
              label="Responsables"
              value={String(
                new Set(filtered.map((causa) => causa.responsable)).size,
              )}
            />
            <SummaryCard
              icon={FileBarChart}
              label="Alertas críticas del dashboard"
              value={String(dashboardStats.conPlazoCritico)}
            />
            <SummaryCard
              icon={FileBarChart}
              label="Hitos de debido proceso pendientes"
              value={String(dueProcessPending)}
            />
          </div>

          {filtered.length > 0 ? (
            <section
              className="card p-5 sm:p-6"
              aria-labelledby="reports-severity-title"
            >
              <div className="mb-4">
                <h3
                  id="reports-severity-title"
                  className="font-bold text-neutral-900"
                >
                  Distribución por gravedad
                </h3>
                <p className="mt-1 text-neutral-500 text-xs">
                  Vista compacta sobre los expedientes que coinciden con los
                  filtros activos.
                </p>
              </div>
              <TrendChart
                points={severityTrendPoints}
                legend={
                  severityLegend.length > 0
                    ? severityLegend
                    : severityTrendPoints.map((point) => point.series[0])
                }
                title="Resumen filtrado"
                description="Cada barra representa una gravedad RICE."
                badge="Gravedad"
                activeLabel="Presente"
              />
            </section>
          ) : null}

          <section
            className="card p-5 sm:p-6"
            aria-labelledby="reports-decisions-title"
          >
            <div className="mb-5">
              <p className="font-semibold text-brand-600 text-xs uppercase tracking-[0.14em]">
                Lectura orientadora
              </p>
              <h3
                id="reports-decisions-title"
                className="mt-1 font-bold text-neutral-900"
              >
                Señales para la toma de decisiones educativas
              </h3>
              <p className="mt-1 max-w-3xl text-neutral-500 text-sm">
                Estas señales ayudan a priorizar conversaciones y apoyos. No son
                diagnósticos, no etiquetan a estudiantes ni reemplazan el
                análisis profesional del equipo.
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {decisionInsights.map((insight: DecisionInsight) => (
                <article
                  key={insight.title}
                  className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold text-neutral-900">
                      {insight.title}
                    </h4>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 font-bold text-[10px] uppercase tracking-wide ${
                        insight.priority === "Alta"
                          ? "bg-red-100 text-red-700"
                          : insight.priority === "Media"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-neutral-200 text-neutral-700"
                      }`}
                    >
                      Prioridad {insight.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-neutral-600 text-sm">
                    <strong className="text-neutral-800">Evidencia:</strong>{" "}
                    {insight.evidence}
                  </p>
                  <p className="mt-2 text-neutral-600 text-sm">
                    <strong className="text-neutral-800">
                      Siguiente acción:
                    </strong>{" "}
                    {insight.action}
                  </p>
                  <p className="mt-3 border-neutral-200 border-t pt-3 text-neutral-500 text-xs">
                    <strong className="text-neutral-700">
                      Límite de interpretación:
                    </strong>{" "}
                    {insight.limitation}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {reportScope === "anotaciones" ? (
        <section
          className="card p-5 sm:p-6"
          aria-labelledby="reports-annotations-title"
        >
          <div className="mb-5">
            <p className="font-semibold text-secondary-700 text-xs uppercase tracking-[0.14em]">
              Anotaciones · ciclo escolar {getCurrentSchoolYear()}
            </p>
            <h3
              id="reports-annotations-title"
              className="mt-1 font-bold text-neutral-900"
            >
              Lectura para acompañamiento formativo
            </h3>
            <p className="mt-1 max-w-3xl text-neutral-500 text-sm">
              Tendencias agregadas para conversar sobre prevención, apoyos y
              seguimiento. No muestra nombres ni genera rankings de estudiantes.
            </p>
          </div>
          {annotationTrend.isLoading ? (
            <p className="text-neutral-500 text-sm">
              Cargando tendencia de anotaciones…
            </p>
          ) : annotationTrend.isError ? (
            <p className="text-neutral-500 text-sm">
              No fue posible cargar la tendencia de anotaciones.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Total", annotationSummary.total],
                  ["Negativas", annotationSummary.negative],
                  ["Positivas", annotationSummary.positive],
                  ["Informativas", annotationSummary.informational],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-neutral-500 text-xs">{label}</p>
                    <p className="mt-1 font-bold text-2xl text-neutral-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {annotationInsights.map((insight) => (
                  <article
                    key={insight.title}
                    className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold text-neutral-900">
                        {insight.title}
                      </h4>
                      <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-1 font-bold text-[10px] text-neutral-700 uppercase">
                        Prioridad {insight.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-neutral-600 text-sm">
                      <strong className="text-neutral-800">Evidencia:</strong>{" "}
                      {insight.evidence}
                    </p>
                    <p className="mt-2 text-neutral-600 text-sm">
                      <strong className="text-neutral-800">
                        Acción sugerida:
                      </strong>{" "}
                      {insight.action}
                    </p>
                    <p className="mt-3 border-neutral-200 border-t pt-3 text-neutral-500 text-xs">
                      {insight.limitation}
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {usage.data ? (
        <section className="card p-5 sm:p-6">
          <div className="mb-5">
            <p className="font-semibold text-neutral-500 text-xs uppercase tracking-[0.14em]">
              Operación de la plataforma
            </p>
            <h3 className="mt-1 font-bold text-neutral-900">
              Actividad de la plataforma
            </h3>
            <p className="mt-1 max-w-3xl text-neutral-500 text-sm">
              Información para evaluar adopción y acompañar al equipo en el uso
              del sistema. No es una métrica de convivencia ni un indicador de
              desempeño educativo.
            </p>
          </div>
          {usageSummary ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-neutral-500 text-xs">Acciones registradas</p>
                <p className="mt-1 font-bold text-2xl text-neutral-900">
                  {usageSummary.totalEvents}
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-neutral-500 text-xs">Días con actividad</p>
                <p className="mt-1 font-bold text-2xl text-neutral-900">
                  {usageSummary.activeDays}
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-neutral-500 text-xs">
                  Usuarios activos máximo diario
                </p>
                <p className="mt-1 font-bold text-2xl text-neutral-900">
                  {usageSummary.peakActiveUsers}
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-neutral-500 text-xs">
                  Actividad del último día
                </p>
                <p className="mt-1 font-bold text-2xl text-neutral-900">
                  {usageSummary.latestActiveUsers}
                </p>
              </div>
            </div>
          ) : null}
          <p className="mt-1 text-neutral-500 text-xs">
            Evento más utilizado:{" "}
            <strong className="text-neutral-700">
              {usageSummary?.topEvent?.event_name ?? "Sin datos"}
            </strong>
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {usage.data.events.slice(0, 4).map((event) => (
              <span
                key={event.event_name}
                className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2 font-semibold text-neutral-700 text-xs"
              >
                <span>{event.event_name}</span>
                <strong>{event.total_count}</strong>
              </span>
            ))}
          </div>
          <p className="mt-4 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-600 text-xs">
            Orientación: si la actividad se concentra en pocos eventos o
            disminuye, planifica una capacitación breve y revisa si el equipo
            necesita apoyo para registrar y dar seguimiento.
          </p>
        </section>
      ) : null}

      <section className="card overflow-hidden">
        <div className="border-neutral-200/70 border-b px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-neutral-900">
                Historial de reportes
              </h3>
              <p className="mt-1 text-neutral-500 text-xs">
                Registro de exportaciones generadas desde este centro.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => void history.refetch()}
              aria-label="Actualizar historial"
              className="min-h-11 rounded-lg px-3 py-2 text-xs"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="divide-y divide-neutral-100">
          {history.isLoading ? (
            <p className="p-5 text-neutral-500 text-sm">Cargando historial…</p>
          ) : history.isError ? (
            <div className="p-5 text-neutral-500 text-sm">
              No fue posible cargar el historial.
            </div>
          ) : history.data?.length ? (
            history.data.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  <History
                    className="size-4 text-neutral-500"
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-neutral-800">
                    {item.file_name ?? item.report_type}
                  </span>
                </div>
                <span className="text-neutral-500 text-xs">
                  {item.row_count} registros ·{" "}
                  {formatChileDateTime(item.created_at)}
                </span>
              </div>
            ))
          ) : (
            <p className="p-5 text-neutral-500 text-sm">
              Aún no hay reportes generados.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
