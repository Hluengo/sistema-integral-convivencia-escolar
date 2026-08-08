/** @license SPDX-License-Identifier: Apache-2.0 */

export interface ChartSeriesItem {
  label: string;
  value: number;
  className: string;
}

export interface TrendChartPoint {
  key: string;
  label: string;
  series: ChartSeriesItem[];
  primary: string;
  secondary: string;
  isObserved?: boolean;
  isCurrent?: boolean;
}

export function LegendPill({ item }: { item: Pick<ChartSeriesItem, 'label' | 'className'> }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${item.className}`} aria-hidden="true" />
      {item.label}
    </span>
  );
}

export function MonthlyBars({ points }: { points: TrendChartPoint[] }) {
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => point.series.map((series) => series.value)),
  );

  return (
    <div
      className="grid h-52 min-w-[36rem] items-end gap-2 sm:min-w-0"
      style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {points.map((point) => (
        <div
          key={point.key}
          className={`flex h-full min-w-0 flex-col justify-end gap-2 ${
            point.isObserved === false ? 'opacity-35' : ''
          }`}
        >
          <div className="flex h-40 items-end justify-center gap-1">
            {point.series.map((item) => {
              const height =
                item.value > 0 ? Math.max(7, Math.round((item.value / maxValue) * 152)) : 3;
              return (
                <div
                  key={item.label}
                  className={`w-2.5 rounded-t-sm ${item.className}`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
          <div className="space-y-0.5 text-center">
            <span
              className={`block truncate font-medium text-11px ${
                point.isCurrent ? 'text-neutral-800' : 'text-neutral-400'
              }`}
            >
              {point.label}
            </span>
            {point.isCurrent ? (
              <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-brand-600" />
            ) : (
              <span className="block h-1.5" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({
  points,
  legend,
  title,
  description,
  badge,
  activeLabel = 'Activo',
}: {
  points: TrendChartPoint[];
  legend: Array<Pick<ChartSeriesItem, 'label' | 'className'>>;
  title: string;
  description: string;
  badge: string;
  activeLabel?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-neutral-500 text-xs">
          {legend.map((item) => (
            <LegendPill key={item.label} item={item} />
          ))}
          <span className="inline-flex items-center gap-1.5 text-neutral-400">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-600" aria-hidden="true" />
            {activeLabel}
          </span>
        </div>
        <MonthlyBars points={points} />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-neutral-700 text-sm">{title}</p>
            <p className="mt-1 text-neutral-500 text-xs">{description}</p>
          </div>
          <span className="rounded-full bg-white px-2 py-1 font-semibold text-10px text-neutral-500 uppercase tracking-wide">
            {badge}
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {points.map((point) => (
            <div
              key={point.key}
              className={`grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-xs ${
                point.isCurrent
                  ? 'bg-brand-50 text-brand-800'
                  : point.isObserved === false
                    ? 'bg-neutral-100 text-neutral-400'
                    : 'bg-white text-neutral-700'
              }`}
            >
              <span className="font-semibold capitalize">{point.label}</span>
              <span className="min-w-0 truncate">
                {point.isObserved === false ? 'Pendiente' : point.primary}
              </span>
              <span className="font-medium tabular-nums">
                {point.isObserved === false ? 'Pend.' : point.secondary}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
