/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ComponentType, ReactNode } from "react";
import { ChevronRight } from "lucide-react";

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
  description?: string;
  showRankCircle?: boolean;
  footer?: ReactNode;
  showBar?: boolean;
  showChevron?: boolean;
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
  description,
  showRankCircle = false,
  footer,
  showBar = true,
  showChevron = false,
}: RankingCardProps) {
  const maxCount =
    items.length > 0 ? Math.max(...items.map((item) => item.count)) : 0;

  return (
    <article
      className="flex min-h-[610px] flex-col rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      aria-labelledby={titleId}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-brand-50">
            <Icon className="size-3.5 text-brand-600" aria-hidden="true" />
          </div>
          <h3 id={titleId} className="font-bold text-neutral-900 text-[13px]">
            {title}
          </h3>
        </div>
        {headerBadge ? (
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-1 font-semibold text-neutral-600 text-10px">
            {headerBadge}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="mb-4 text-slate-500 text-[10px]">{description}</p>
      ) : null}

      {isLoading ? (
        <BarSkeleton />
      ) : error ? (
        <p className="text-gravisima-600 text-sm" role="alert">
          {errorMessage}
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Icon className="h-8 w-8 text-neutral-400" aria-hidden="true" />
          <p className="font-medium text-neutral-500 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => {
            const widthPercentage =
              maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const position = index + 1;

            return (
              <li key={item.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {showRankCircle ? (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-neutral-600 text-10px"
                        aria-hidden="true"
                      >
                        {position}
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate font-bold text-neutral-800 text-xs">
                        {showRankCircle
                          ? item.label
                          : `${position}. ${item.label}`}
                      </p>
                      {item.sublabel ? (
                        <p className="truncate text-neutral-500 text-xs">
                          {item.sublabel}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={
                        showRankCircle
                          ? `rounded-full px-2 py-0.5 font-bold text-xs tabular-nums ${item.count >= 30 ? "bg-gravisima-50 text-gravisima-600" : item.count >= 20 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`
                          : "font-extrabold text-gravisima-700 text-[15px] tabular-nums"
                      }
                    >
                      {item.count}
                    </span>
                    {showChevron ? (
                      <ChevronRight
                        className="size-3.5 text-slate-500"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                </div>
                {showBar ? (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${barColorClass} transition-all duration-500`}
                      style={{ width: `${widthPercentage}%` }}
                      aria-hidden="true"
                    />
                  </div>
                ) : null}
                {item.badges ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.badges}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {footer ? (
        <div className="mt-auto border-slate-100 border-t pt-3">{footer}</div>
      ) : null}
    </article>
  );
}
