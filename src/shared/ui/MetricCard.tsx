/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from "react";
import { memo, type ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  trend?: { value: string; positive: boolean };
  onClick?: () => void;
  isAlert?: boolean;
  footer?: ReactNode;
  valueAside?: ReactNode;
}

export default memo(function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  onClick,
  isAlert,
  footer,
  valueAside,
}: MetricCardProps) {
  const Comp = onClick ? "button" : "div";
  const interactionProps = onClick
    ? {
        onClick,
        type: "button" as const,
        "aria-label": `Ver detalles de ${label}`,
      }
    : {};

  return (
    <Comp
      {...interactionProps}
      className={`group relative rounded-xl border border-[#e2e8f0] bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-150 ${
        onClick
          ? "cursor-pointer hover:border-slate-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
          : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <span className="font-semibold text-[#0f172a] text-[13px]">
            {label}
          </span>
          {sublabel && (
            <span className="mt-0.5 block font-medium text-slate-500 text-[11px]">
              {sublabel}
            </span>
          )}
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          <Icon className={`size-5 ${iconColor}`} aria-hidden="true" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`font-extrabold text-[32px] leading-none tracking-tight ${
            isAlert ? "text-gravisima-600" : "text-neutral-900"
          }`}
        >
          {value}
        </span>
        {valueAside ? <span className="min-w-0">{valueAside}</span> : null}
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-11px ${
              trend.positive
                ? "bg-leve-50 text-leve-700"
                : "bg-gravisima-50 text-gravisima-700"
            }`}
          >
            {trend.positive ? (
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-3 w-3" aria-hidden="true" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      {footer ? (
        <div className="mt-4 border-slate-100 border-t pt-3">{footer}</div>
      ) : null}
    </Comp>
  );
});
