/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { memo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
  const Comp = onClick ? 'button' : 'div';
  const interactionProps = onClick
    ? { onClick, type: 'button' as const, 'aria-label': `Ver detalles de ${label}` }
    : {};

  return (
    <Comp
      {...interactionProps}
      className={`group relative rounded-xl border border-neutral-200/80 bg-white p-5 shadow-md transition-colors duration-300 ${
        onClick
          ? 'cursor-pointer hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg active:scale-[0.99]'
          : 'hover:-translate-y-0.5 hover:shadow-lg'
      }`}
    >
      {/* Accent top border */}
      <div
        className="absolute top-0 right-4 left-4 h-[3px] rounded-full opacity-80"
        style={{ background: accentColor }}
      />

      <div className="mb-4 flex items-start justify-between">
        <div>
          <span className="font-semibold text-neutral-400 text-xs uppercase tracking-[0.06em]">
            {label}
          </span>
          {sublabel && (
            <span className="mt-0.5 block font-medium text-neutral-300 text-xs">{sublabel}</span>
          )}
        </div>
        <div className={`rounded-xl p-2.5 ${iconBg} shrink-0 ring-1 ring-black/5`}>
          <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`font-bold text-3xl tracking-tight ${
            isAlert ? 'text-gravisima-600' : 'text-neutral-900'
          }`}
        >
          {typeof value === 'number' && value > 0 && value < 10 ? `0${value}` : value}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-[11px] ${
              trend.positive ? 'bg-leve-50 text-leve-700' : 'bg-gravisima-50 text-gravisima-700'
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
