/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { memo } from 'react';

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
      className={`group relative bg-white rounded-xl border border-neutral-200/80 p-5 shadow-md transition-all duration-300 ${
        onClick
          ? 'cursor-pointer hover:border-neutral-300 hover:shadow-lg hover:-translate-y-1 active:scale-[0.99]'
          : 'hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {/* Accent top border */}
      <div
        className="absolute top-0 left-4 right-4 h-[3px] rounded-full opacity-80"
        style={{ background: accentColor }}
      />

      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-[0.06em]">
            {label}
          </span>
          {sublabel && (
            <span className="block text-[10px] text-neutral-300 font-medium mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${iconBg} ring-1 ring-black/5 shrink-0`}>
          <Icon className={`h-4 w-4 ${iconColor}`} aria-hidden="true" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-3xl font-bold tracking-tight ${
            isAlert ? 'text-gravisima-600' : 'text-neutral-900'
          }`}
        >
          {typeof value === 'number' && value < 10 ? `0${value}` : value}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              trend.positive
                ? 'bg-leve-50 text-leve-700'
                : 'bg-gravisima-50 text-gravisima-700'
            }`}
          >
            <svg
              className={`h-3 w-3 ${trend.positive ? '' : 'rotate-180'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
            {trend.value}
          </span>
        )}
      </div>
    </Comp>
  );
});