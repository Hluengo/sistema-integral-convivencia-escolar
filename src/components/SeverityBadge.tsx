import React, { memo } from 'react';
import { getSeverityColor } from '../lib/severityUtils';
import type { SeverityLevel } from '../lib/severityUtils';

export type { SeverityLevel } from '../lib/severityUtils';

interface SeverityBadgeProps {
  level: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const SIZE_CLASSES = {
  sm: 'text-[9px] px-1.5 py-0.5 gap-1',
  md: 'text-[10px] px-2 py-1 gap-1.5',
  lg: 'text-[11px] px-2.5 py-1.5 gap-1.5',
};

const DOT_SIZE = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2 w-2',
};

export default memo(function SeverityBadge({ level, size = 'md', showDot = true }: SeverityBadgeProps) {
  const colors = getSeverityColor(level);
  const sizeClass = SIZE_CLASSES[size];
  const dotSize = DOT_SIZE[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full uppercase tracking-wider ${colors.bg} ${colors.text} ${sizeClass}`}
      role="status"
      aria-label={`Gravedad: ${level}`}
    >
      {showDot && (
        <span className={`${dotSize} rounded-full ${colors.dot} shrink-0`} aria-hidden="true" />
      )}
      {level}
    </span>
  );
});