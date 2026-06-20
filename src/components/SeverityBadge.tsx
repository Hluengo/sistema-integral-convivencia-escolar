/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type SeverityLevel = 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima';

interface SeverityBadgeProps {
  level: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

const SEVERITY_CONFIG: Record<SeverityLevel, { bg: string; text: string; dot: string; label: string }> = {
  'Leve': { bg: 'bg-leve-50', text: 'text-leve-700', dot: 'bg-leve-500', label: 'Leve' },
  'Grave': { bg: 'bg-grave-50', text: 'text-grave-700', dot: 'bg-grave-500', label: 'Grave' },
  'Muy Grave': { bg: 'bg-muygrave-50', text: 'text-muygrave-700', dot: 'bg-muygrave-500', label: 'Muy Grave' },
  'Gravísima': { bg: 'bg-gravisima-50', text: 'text-gravisima-700', dot: 'bg-gravisima-500', label: 'Gravísima' },
};

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

export default function SeverityBadge({ level, size = 'md', showDot = true }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[level];
  const sizeClass = SIZE_CLASSES[size];
  const dotSize = DOT_SIZE[size];

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full uppercase tracking-wider ${config.bg} ${config.text} ${sizeClass}`}
      role="status"
      aria-label={`Gravedad: ${config.label}`}
    >
      {showDot && (
        <span className={`${dotSize} rounded-full ${config.dot} shrink-0`} aria-hidden="true" />
      )}
      {config.label}
    </span>
  );
}

// Also export a helper to get severity config for use in other components
export function getSeverityColor(level: SeverityLevel): { bg: string; text: string; border: string; dot: string } {
  const map: Record<SeverityLevel, { bg: string; text: string; border: string; dot: string }> = {
    'Leve': { bg: 'bg-leve-50', text: 'text-leve-700', border: 'border-leve-200', dot: 'bg-leve-500' },
    'Grave': { bg: 'bg-grave-50', text: 'text-grave-700', border: 'border-grave-200', dot: 'bg-grave-500' },
    'Muy Grave': { bg: 'bg-muygrave-50', text: 'text-muygrave-700', border: 'border-muygrave-200', dot: 'bg-muygrave-500' },
    'Gravísima': { bg: 'bg-gravisima-50', text: 'text-gravisima-700', border: 'border-gravisima-200', dot: 'bg-gravisima-500' },
  };
  return map[level];
}