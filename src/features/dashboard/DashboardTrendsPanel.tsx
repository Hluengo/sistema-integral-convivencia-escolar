/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { Activity, CheckCircle, ShieldAlert, TrendingUp } from 'lucide-react';
import type { Causa } from '../../shared/lib/types';
import { buildDashboardTrendSummary, type DashboardTrendPoint } from './dashboardTrends';

interface DashboardTrendsPanelProps {
  causas: Causa[];
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

function MiniBarChart({ points }: { points: DashboardTrendPoint[] }) {
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.opened, point.closed]));

  return (
    <div className="grid h-44 grid-cols-6 items-end gap-2" aria-hidden="true">
      {points.map((point) => {
        const openedHeight = Math.max(6, Math.round((point.opened / maxValue) * 132));
        const closedHeight = Math.max(6, Math.round((point.closed / maxValue) * 132));

        return (
          <div key={point.key} className="flex h-full min-w-0 flex-col justify-end gap-2">
            <div className="flex h-36 items-end justify-center gap-1.5">
              <div
                className="w-3 rounded-t-sm bg-brand-600"
                style={{ height: `${openedHeight}px` }}
              />
              <div
                className="w-3 rounded-t-sm bg-leve-500"
                style={{ height: `${closedHeight}px` }}
              />
            </div>
            <span className="truncate text-center font-medium text-neutral-400 text-[11px]">
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardTrendsPanel({ causas }: DashboardTrendsPanelProps) {
  const summary = useMemo(() => buildDashboardTrendSummary(causas), [causas]);
  const hasData = summary.points.some((point) => point.opened > 0 || point.closed > 0);

  if (!hasData) return null;

  const trendTone =
    summary.openedDelta <= 0
      ? 'bg-leve-50 text-leve-700 ring-leve-100'
      : 'bg-grave-50 text-grave-700 ring-grave-100';

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
              Tendencias de expedientes
            </h3>
          </div>
          <p className="max-w-2xl text-neutral-500 text-sm">
            Últimos seis meses con aperturas, cierres y concentración de casos de mayor gravedad.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[34rem]">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold text-[10px] uppercase tracking-wide">Trimestre</span>
            </div>
            <p className="mt-1 font-bold text-neutral-900 text-xl tabular-nums">
              {summary.currentOpened}
            </p>
          </div>
          <div className={`rounded-lg px-3 py-2 ring-1 ${trendTone}`}>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold text-[10px] uppercase tracking-wide">Variación</span>
            </div>
            <p className="mt-1 font-bold text-xl tabular-nums">
              {formatSigned(summary.openedDelta)}
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold text-[10px] uppercase tracking-wide">
                Alta gravedad
              </span>
            </div>
            <p className="mt-1 font-bold text-neutral-900 text-xl tabular-nums">
              {summary.highSeverityShare}%
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold text-[10px] uppercase tracking-wide">Cierre</span>
            </div>
            <p className="mt-1 font-bold text-neutral-900 text-xl tabular-nums">
              {summary.closureRate}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
          <div className="mb-3 flex items-center gap-4 text-neutral-500 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" aria-hidden="true" />
              Aperturas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-leve-500" aria-hidden="true" />
              Cierres
            </span>
          </div>
          <MiniBarChart points={summary.points} />
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="font-semibold text-neutral-700 text-sm">Mes con mayor ingreso</p>
          <p className="mt-3 font-bold text-3xl text-neutral-900 tabular-nums">
            {summary.busiestMonthTotal}
          </p>
          <p className="text-neutral-500 text-sm capitalize">{summary.busiestMonthLabel}</p>
          <div className="mt-5 space-y-2">
            {summary.points.map((point) => (
              <div key={point.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-neutral-500 capitalize">{point.label}</span>
                <span className="font-semibold text-neutral-700 tabular-nums">
                  {point.opened} / {point.closed}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Tendencias mensuales de expedientes</caption>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Aperturas</th>
            <th>Cierres</th>
            <th>Alta gravedad</th>
          </tr>
        </thead>
        <tbody>
          {summary.points.map((point) => (
            <tr key={point.key}>
              <td>{point.label}</td>
              <td>{point.opened}</td>
              <td>{point.closed}</td>
              <td>{point.highSeverity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
