/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface DataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  accentColor?: string;
  hoverColor?: string;
  barBg?: string;
}

export default function BarChart({
  data,
  height = 180,
  accentColor = '#1d4ed8',
  hoverColor = '#2563eb',
  barBg = 'bg-brand-600',
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[160px] text-neutral-400">
        <BarChart3 className="h-8 w-8 mr-2" aria-hidden="true" />
        <span className="text-sm font-medium">Sin datos disponibles</span>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="relative">
      {/* Bars container */}
      <div className="flex items-end gap-1.5" style={{ height: `${height}px` }}>
        {data.map((point, index) => {
          const percentage = (point.value / maxValue) * 100;
          const isHighest = point.value === maxValue && point.value > 0;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center justify-end h-full group"
            >
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-1 bg-neutral-800 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap pointer-events-none z-10">
                {point.value} {point.value === 1 ? 'causa' : 'causas'}
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t-md transition-all duration-500 ease-out-expo cursor-pointer relative ${
                  isHighest ? 'bg-secondary-500' : barBg
                } ${isHighest ? 'opacity-90' : 'opacity-70'} group-hover:opacity-100`}
                style={{
                  height: `${Math.max(percentage, 2)}%`,
                  minHeight: percentage > 0 ? '4px' : '0px',
                  background: isHighest ? undefined : undefined,
                }}
              >
                {/* Hover highlight */}
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 rounded-t-md transition-opacity" />
              </div>

              {/* Label */}
              <span className="text-[8px] text-neutral-400 font-medium mt-1.5 truncate w-full text-center">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to generate last 30 days data from causas
export function generateLast30Days(causas: { fechaApertura: string; fechaUltimaActualizacion: string }[]): DataPoint[] {
  const days: DataPoint[] = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('es-CL', { weekday: 'short' }).slice(0, 3);
    const dayNum = date.getDate();
    
    // Count causas opened or updated on this day
    const count = causas.filter(c => {
      const fecha = c.fechaUltimaActualizacion || c.fechaApertura;
      return fecha === dateStr;
    }).length;
    
    // Show day of month as label, with day name for first few
    const showDayName = i < 7 || i % 5 === 0;
    days.push({
      label: showDayName ? `${dayName.toUpperCase()}` : '',
      value: count,
    });
  }
  
  return days;
}