/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import type { Causa } from '../../shared/lib/types';
import { TrendChart, type ChartSeriesItem, type TrendChartPoint } from '../../shared/ui/charts';
import {
  buildDashboardTrendSummary,
  type AnnotationTrendRecord,
  type DashboardTrendPoint,
} from './dashboardTrends';

type TrendMode = 'cases' | 'annotations';

interface DashboardTrendsPanelProps {
  causas: Causa[];
  annotationTrends?: AnnotationTrendRecord[];
  annotationTrendLoading?: boolean;
  annotationTrendError?: Error | null;
}

const TREND_MODE_OPTIONS: Array<{
  id: TrendMode;
  label: string;
  icon: typeof Activity;
}> = [
  { id: 'cases', label: 'Expedientes', icon: Activity },
  { id: 'annotations', label: 'Anotaciones', icon: ClipboardList },
];

const MODE_HELPER_TEXT: Record<TrendMode, string> = {
  cases: 'Aperturas, cierres y brecha mensual.',
  annotations: 'Comparación mensual entre anotaciones positivas y negativas.',
};

function getSeriesForPoint(point: DashboardTrendPoint, mode: TrendMode): ChartSeriesItem[] {
  if (mode === 'annotations') {
    return [
      { label: 'Total', value: point.annotations, className: 'bg-neutral-400' },
      { label: 'Positivas', value: point.positiveAnnotations, className: 'bg-leve-500' },
      { label: 'Negativas', value: point.negativeAnnotations, className: 'bg-grave-500' },
      {
        label: 'Alta gravedad',
        value: point.highSeverityAnnotations,
        className: 'bg-gravisima-500',
      },
    ];
  }

  return [
    { label: 'Aperturas', value: point.opened, className: 'bg-brand-600' },
    { label: 'Cierres', value: point.closed, className: 'bg-leve-500' },
    { label: 'Brecha', value: Math.max(point.netLoad, 0), className: 'bg-grave-500' },
  ];
}

function getModeTotals(points: DashboardTrendPoint[], mode: TrendMode): ChartSeriesItem[] {
  return getSeriesForPoint(
    points.reduce(
      (acc, point) => ({
        ...acc,
        opened: acc.opened + point.opened,
        closed: acc.closed + point.closed,
        netLoad: acc.netLoad + point.netLoad,
        highSeverity: acc.highSeverity + point.highSeverity,
        annotations: acc.annotations + point.annotations,
        positiveAnnotations: acc.positiveAnnotations + point.positiveAnnotations,
        negativeAnnotations: acc.negativeAnnotations + point.negativeAnnotations,
        highSeverityAnnotations: acc.highSeverityAnnotations + point.highSeverityAnnotations,
      }),
      {
        key: 'total',
        label: 'total',
        opened: 0,
        closed: 0,
        netLoad: 0,
        closureRate: 0,
        highSeverity: 0,
        annotations: 0,
        positiveAnnotations: 0,
        negativeAnnotations: 0,
        highSeverityAnnotations: 0,
        positiveAnnotationShare: 0,
        negativeAnnotationShare: 0,
        highSeverityAnnotationShare: 0,
        isObserved: true,
        isCurrentMonth: false,
      },
    ),
    mode,
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  helper: string;
  tone: 'neutral' | 'brand' | 'grave' | 'leve';
}) {
  const toneClasses = {
    neutral: 'bg-neutral-100 text-neutral-500',
    brand: 'bg-brand-50 text-brand-700',
    grave: 'bg-grave-50 text-grave-700',
    leve: 'bg-leve-50 text-leve-700',
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-2 text-neutral-500">
        <span className={`rounded-md p-1.5 ${toneClasses[tone]}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="font-semibold text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-bold text-2xl text-neutral-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-neutral-500 text-xs">{helper}</p>
    </div>
  );
}

export default function DashboardTrendsPanel({
  causas,
  annotationTrends = [],
  annotationTrendLoading = false,
  annotationTrendError = null,
}: DashboardTrendsPanelProps) {
  const [mode, setMode] = useState<TrendMode>('cases');
  const summary = useMemo(
    () => buildDashboardTrendSummary(causas, annotationTrends),
    [causas, annotationTrends],
  );
  const observedPoints = summary.points.filter((point) => point.isObserved);
  const activeModeTotals = getModeTotals(observedPoints, mode);
  const chartPoints: TrendChartPoint[] = summary.points.map((point) => ({
    key: point.key,
    label: point.label,
    series: getSeriesForPoint(point, mode),
    primary:
      mode === 'cases'
        ? `${point.opened} apert. · ${point.closed} cierres`
        : `${point.annotations} total · ${point.positiveAnnotations} pos. · ${point.negativeAnnotations} neg.`,
    secondary:
      mode === 'cases'
        ? point.netLoad > 0
          ? `Brecha ${point.netLoad}`
          : 'Sin brecha'
        : `${point.positiveAnnotationShare}% positivas · ${point.negativeAnnotationShare}% negativas`,
    isObserved: point.isObserved,
    isCurrent: point.isCurrentMonth,
  }));
  const hasData = summary.points.some(
    (point) => point.opened > 0 || point.closed > 0 || point.annotations > 0,
  );

  if (!hasData && !annotationTrendLoading && !annotationTrendError) return null;

  return (
    <section className="card p-5" aria-labelledby="dashboard-trends-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-neutral-100 p-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
            </div>
            <h3
              id="dashboard-trends-title"
              className="font-semibold text-neutral-500 text-xs uppercase tracking-[0.06em]"
            >
              Tendencias del año escolar
            </h3>
          </div>
          <p className="max-w-2xl text-neutral-600 text-sm">
            Ciclo marzo-diciembre {summary.schoolYear}. Datos observados hasta{' '}
            <span className="font-semibold capitalize text-neutral-800">
              {summary.lastObservedMonthLabel}
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 font-medium text-neutral-600">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {summary.observedMonthCount} meses observados
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 font-medium text-neutral-600">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            Cierre {summary.closureRate}%
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          icon={Activity}
          label="Aperturas"
          value={summary.openedTotal}
          helper={`${summary.closedTotal} cierres registrados`}
          tone="brand"
        />
        <SummaryMetric
          icon={Gauge}
          label="Brecha"
          value={Math.max(summary.netLoadTotal, 0)}
          helper={summary.netLoadTotal > 0 ? 'aperturas sobre cierres' : 'sin brecha observada'}
          tone={summary.netLoadTotal > 0 ? 'grave' : 'leve'}
        />
        <SummaryMetric
          icon={ClipboardList}
          label="Anotaciones"
          value={annotationTrendLoading ? '...' : summary.annotationTotal}
          helper={`${summary.positiveAnnotationShare}% positivas · ${summary.negativeAnnotationShare}% negativas`}
          tone="neutral"
        />
        <SummaryMetric
          icon={ClipboardList}
          label="Distribución"
          value={
            annotationTrendLoading
              ? '...'
              : `${summary.positiveAnnotationShare}/${summary.negativeAnnotationShare}%`
          }
          helper="positivas / negativas"
          tone="leve"
        />
      </div>

      <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-brand-900 text-sm">{summary.primaryInsight}</p>
            <p className="mt-1 text-brand-800 text-xs">{summary.secondaryInsight}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            <p className="font-semibold text-neutral-700 text-sm">Vista mensual</p>
          </div>
          <p className="mt-1 text-neutral-500 text-xs">{MODE_HELPER_TEXT[mode]}</p>
        </div>
        <div className="inline-flex w-full rounded-lg border border-neutral-200 bg-neutral-50 p-1 sm:w-auto">
          {TREND_MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setMode(option.id)}
                className={`flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-3 font-semibold text-xs transition-colors sm:flex-none ${
                  active
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:bg-white/70 hover:text-neutral-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <TrendChart
          points={chartPoints}
          legend={activeModeTotals}
          title="Resumen mensual"
          description="Meses futuros se muestran pendientes."
          badge={TREND_MODE_OPTIONS.find((option) => option.id === mode)?.label ?? 'Vista'}
          activeLabel="Mes actual"
        />
      </div>

      {annotationTrendError ? (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-lg border border-grave-200 bg-grave-50 px-3 py-2 text-grave-700 text-xs"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          No se pudieron cargar las tendencias de anotaciones.
        </div>
      ) : null}

      <table className="sr-only">
        <caption>Tendencias mensuales marzo-diciembre</caption>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Observado</th>
            <th>Aperturas</th>
            <th>Cierres</th>
            <th>Brecha</th>
            <th>Tasa de cierre</th>
            <th>Alta gravedad</th>
            <th>Anotaciones</th>
            <th>Anotaciones positivas</th>
            <th>Anotaciones negativas</th>
            <th>Anotaciones de alta gravedad</th>
            <th>Porcentaje negativas</th>
            <th>Porcentaje positivas</th>
          </tr>
        </thead>
        <tbody>
          {summary.points.map((point) => (
            <tr key={point.key}>
              <td>{point.label}</td>
              <td>{point.isObserved ? 'Sí' : 'Pendiente'}</td>
              <td>{point.opened}</td>
              <td>{point.closed}</td>
              <td>{point.netLoad}</td>
              <td>{point.closureRate}%</td>
              <td>{point.highSeverity}</td>
              <td>{point.annotations}</td>
              <td>{point.positiveAnnotations}</td>
              <td>{point.negativeAnnotations}</td>
              <td>{point.highSeverityAnnotations}</td>
              <td>{point.negativeAnnotationShare}%</td>
              <td>{point.positiveAnnotationShare}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
