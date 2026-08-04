/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ComponentType, ReactNode } from 'react';

export interface RankingCardItem {
  key: string;
  label: string;
  sublabel?: string;
  count: number;
  badges?: ReactNode;
}

interface RankingCardProps {
  title: string;
  titleId: string;
  icon: ComponentType<{ className?: string }>;
  emptyMessage: string;
  errorMessage: string;
  isLoading?: boolean;
  error?: Error | null;
  items: RankingCardItem[];
  barColorClass: string;
  headerBadge?: string;
}

function BarSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="animate-pulse space-y-1.5">
          <div className="h-4 w-1/2 rounded bg-neutral-100" />
          <div className="h-2.5 w-full rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export default function RankingCard({
  title,
  titleId,
  icon: Icon,
  emptyMessage,
  errorMessage,
  isLoading,
  error,
  items,
  barColorClass,
  headerBadge,
}: RankingCardProps) {
  const maxCount = items.length > 0 ? Math.max(...items.map((item) => item.count)) : 0;

  return (
    <article className="card p-5" aria-labelledby={titleId}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-lg bg-neutral-100 p-1.5">
            <Icon className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
          </div>
          <h3
            id={titleId}
            className="font-semibold text-neutral-500 text-xs uppercase tracking-[0.06em]"
          >
            {title}
          </h3>
        </div>
        {headerBadge ? (
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 font-semibold text-neutral-500 text-[10px] uppercase tracking-wide">
            {headerBadge}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <BarSkeleton />
      ) : error ? (
        <p className="text-gravisima-600 text-sm" role="alert">
          {errorMessage}
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Icon className="h-8 w-8 text-neutral-300" aria-hidden="true" />
          <p className="font-medium text-neutral-400 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => {
            const widthPercentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const position = index + 1;

            return (
              <li key={item.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 font-semibold text-neutral-500 text-[10px]"
                      aria-hidden="true"
                    >
                      {position}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-700 text-sm">{item.label}</p>
                      {item.sublabel ? (
                        <p className="truncate text-neutral-400 text-xs">{item.sublabel}</p>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 font-bold text-neutral-900 text-sm tabular-nums">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full ${barColorClass} transition-all duration-500`}
                    style={{ width: `${widthPercentage}%` }}
                    aria-hidden="true"
                  />
                </div>
                {item.badges ? (
                  <div className="flex flex-wrap items-center gap-1.5">{item.badges}</div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
