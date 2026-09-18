/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from "react";
import { memo } from "react";
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
}

export default memo(function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconBg,
  iconColor,
  accentColor,
  trend,
  onClick,
  isAlert,
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
      className={`group relative border-neutral-200 px-4 py-3 transition-colors duration-150 sm:border-r sm:last:border-r-0 ${
        onClick
          ? "cursor-pointer hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600"
          : ""
      }`}
    >
      <div
        className="absolute top-0 right-4 left-4 h-0.5 rounded-full opacity-80"
        style={{ background: accentColor }}
      />

      <div className="mb-3 flex items-start justify-between">
        <div>
          <span className="font-semibold text-neutral-600 text-xs">
            {label}
          </span>
          {sublabel && (
            <span className="mt-0.5 block font-medium text-neutral-500 text-xs">
              {sublabel}
            </span>
          )}
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`font-bold text-3xl tracking-tight ${
            isAlert ? "text-gravisima-600" : "text-neutral-900"
          }`}
        >
          {typeof value === "number" && value > 0 && value < 10
            ? `0${value}`
            : value}
        </span>
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
    </Comp>
  );
});
