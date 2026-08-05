/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileBarChart, History, RefreshCw } from 'lucide-react';
import type { Causa, TipoInfraccion } from '../../shared/lib/types';
import Button from '../../shared/ui/Button';
import SummaryCard from '../../shared/ui/SummaryCard';
import PageHero from '../../shared/ui/PageHero';
import { TrendChart, type ChartSeriesItem, type TrendChartPoint } from '../../shared/ui/charts';
import { formatChileDateTime } from '../../shared/lib/dateTime';
import { useAuthStore } from '../../shared/lib/stores/authStore';
import { fetchUsageStats } from '../../shared/api/services/admin.service';
import {
  createReportHistory,
  fetchReportHistory,
  type ReportFilters,
} from '../../shared/api/services/reports.service';
import { getStats } from '../../shared/lib/data';
import { buildReportFileName, buildReportSheet, filterReportCausas } from './reportUtils';

const EMPTY_FILTERS: ReportFilters = {
  course: '',
  fromDate: '',
  toDate: '',
  status: '',
  responsible: '',
};
const SELECT_CLASS =
  'rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
const SEVERITY_ORDER: TipoInfraccion[] = ['Leve', 'Grave', 'Muy Grave', 'Gravísima'];
const SEVERITY_COLORS: Record<TipoInfraccion, string> = {
  Leve: 'bg-leve-500',
  Grave: 'bg-grave-500',
  'Muy Grave': 'bg-muygrave-500',
  Gravísima: 'bg-gravisima-500',
};

function buildSeverityTrendPoints(causas: Causa[]): TrendChartPoint[] {
  const total = Math.max(1, causas.length);
  const counts = new Map<TipoInfraccion, number>(SEVERITY_ORDER.map((severity) => [severity, 0]));
  for (const causa of causas) {
    counts.set(causa.tipoInfraccion, (counts.get(causa.tipoInfraccion) ?? 0) + 1);
  }

  return SEVERITY_ORDER.map((severity) => {
    const value = counts.get(severity) ?? 0;
    const share = Math.round((value / total) * 100);
    return {
      key: severity,
      label: severity,
      series: [{ label: severity, value, className: SEVERITY_COLORS[severity] }],
      primary: `${value} expediente${value === 1 ? '' : 's'}`,
      secondary: `${share}%`,
      isObserved: true,
      isCurrent: value > 0,
    };
  });
}

function buildSeverityLegend(points: TrendChartPoint[]): ChartSeriesItem[] {
  return points.map((point) => point.series[0]).filter((item) => item.value > 0);
}

export default function ReportsCenter({ causas }: { causas: Causa[] }) {
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((state) => state.tenantId);
  const history = useQuery({
    queryKey: ['reports', 'history', tenantId],
    queryFn: fetchReportHistory,
    enabled: Boolean(tenantId),
  });
  const usage = useQuery({
    queryKey: ['reports', 'usage', tenantId],
    queryFn: fetchUsageStats,
    enabled: Boolean(tenantId),
    retry: false,
  });
  const filtered = useMemo(() => filterReportCausas(causas, filters), [causas, filters]);
  const dashboardStats = useMemo(() => getStats(filtered), [filtered]);
  const severityTrendPoints = useMemo(() => buildSeverityTrendPoints(filtered), [filtered]);
  const severityLegend = useMemo(
    () => buildSeverityLegend(severityTrendPoints),
    [severityTrendPoints],
  );
  const dueProcessPending = filtered.reduce(
    (total, causa) =>
      total + causa.checklistDebidoProceso.filter((item) => !item.completado).length,
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
      const { default: writeExcelFile } = await import('write-excel-file/browser');
      await writeExcelFile(buildReportSheet(filtered, generatedAt), {
        sheet: 'Expedientes',
        columns: [
          { width: 20 },
          { width: 20 },
          { width: 38 },
          { width: 24 },
          { width: 14 },
          { width: 14 },
          { width: 20 },
        ],
      }).toFile(fileName);
      await createReportHistory({
        reportType: 'expedientes',
        filters,
        rowCount: filtered.length,
        fileName,
      });
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['reports', 'history', tenantId] }),
  });
  const setFilter = (key: keyof ReportFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHero
        eyebrow="Reportes · Gestión institucional"
        title="Centro de reportes"
        description="Dashboard, expedientes y métricas con filtros auditables."
        action={
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="rounded-xl bg-secondary-500 px-4 py-2.5 text-sm shadow-md shadow-secondary-500/30 hover:bg-secondary-600"
          >
            <Download className="size-4" aria-hidden="true" />{' '}
            {exportMutation.isPending ? 'Generando…' : 'Exportar Excel'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <select
          className={SELECT_CLASS}
          value={filters.course}
          onChange={(event) => setFilter('course', event.target.value)}
          aria-label="Curso"
        >
          <option value="">Todos los cursos</option>
          {courses.map((course) => (
            <option key={course}>{course}</option>
          ))}
        </select>
        <input
          className={SELECT_CLASS}
          type="date"
          aria-label="Desde"
          value={filters.fromDate}
          onChange={(event) => setFilter('fromDate', event.target.value)}
        />
        <input
          className={SELECT_CLASS}
          type="date"
          aria-label="Hasta"
          value={filters.toDate}
          onChange={(event) => setFilter('toDate', event.target.value)}
        />
        <select
          className={SELECT_CLASS}
          value={filters.status}
          onChange={(event) => setFilter('status', event.target.value)}
          aria-label="Estado"
        >
          <option value="">Todos los estados</option>
          {[...new Set(causas.map((causa) => causa.estadoActual))].sort().map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <select
          className={SELECT_CLASS}
          value={filters.responsible}
          onChange={(event) => setFilter('responsible', event.target.value)}
          aria-label="Responsable"
        >
          <option value="">Todos los responsables</option>
          {responsibles.map((responsible) => (
            <option key={responsible}>{responsible}</option>
          ))}
        </select>
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
          value={String(new Set(filtered.map((causa) => causa.estudianteCurso)).size)}
        />
        <SummaryCard
          icon={FileBarChart}
          label="Responsables"
          value={String(new Set(filtered.map((causa) => causa.responsable)).size)}
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
        <section className="card p-5 sm:p-6" aria-labelledby="reports-severity-title">
          <div className="mb-4">
            <h3 id="reports-severity-title" className="font-bold text-neutral-900">
              Distribución por gravedad
            </h3>
            <p className="mt-1 text-neutral-500 text-xs">
              Vista compacta sobre los expedientes que coinciden con los filtros activos.
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

      {usage.data ? (
        <section className="card p-5 sm:p-6">
          <h3 className="font-bold text-neutral-900">Métricas de uso</h3>
          <p className="mt-1 text-neutral-500 text-xs">
            Reutilizadas desde el módulo de administración.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {usage.data.events.slice(0, 4).map((event) => (
              <span
                key={event.event_name}
                className="rounded-full bg-neutral-100 px-3 py-1.5 font-semibold text-neutral-700 text-xs"
              >
                {event.event_name}: <strong>{event.total_count}</strong>
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card overflow-hidden">
        <div className="border-neutral-200/70 border-b px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-neutral-900">Historial de reportes</h3>
              <p className="mt-1 text-neutral-500 text-xs">
                Registro de exportaciones generadas desde este centro.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => void history.refetch()}
              aria-label="Actualizar historial"
              className="rounded-lg px-3 py-2 text-xs"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="divide-y divide-neutral-100">
          {history.isLoading ? (
            <p className="p-5 text-neutral-500 text-sm">Cargando historial…</p>
          ) : history.isError ? (
            <div className="p-5 text-neutral-500 text-sm">No fue posible cargar el historial.</div>
          ) : history.data?.length ? (
            history.data.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  <History className="size-4 text-neutral-400" aria-hidden="true" />
                  <span className="font-semibold text-neutral-800">
                    {item.file_name ?? item.report_type}
                  </span>
                </div>
                <span className="text-neutral-500 text-xs">
                  {item.row_count} registros · {formatChileDateTime(item.created_at)}
                </span>
              </div>
            ))
          ) : (
            <p className="p-5 text-neutral-500 text-sm">Aún no hay reportes generados.</p>
          )}
        </div>
      </section>
    </div>
  );
}
