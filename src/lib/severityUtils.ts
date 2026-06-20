/**
 * Severity colour helpers — kept separate from component files
 * so Fast Refresh can work cleanly on SeverityBadge.tsx.
 */

export type SeverityLevel = 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima';

export interface SeverityColors {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

const SEVERITY_COLOR_MAP: Record<SeverityLevel, SeverityColors> = {
  'Leve': {
    bg: 'bg-leve-50',
    text: 'text-leve-700',
    border: 'border-leve-200',
    dot: 'bg-leve-500',
  },
  'Grave': {
    bg: 'bg-grave-50',
    text: 'text-grave-700',
    border: 'border-grave-200',
    dot: 'bg-grave-500',
  },
  'Muy Grave': {
    bg: 'bg-muygrave-50',
    text: 'text-muygrave-700',
    border: 'border-muygrave-200',
    dot: 'bg-muygrave-500',
  },
  'Gravísima': {
    bg: 'bg-gravisima-50',
    text: 'text-gravisima-700',
    border: 'border-gravisima-200',
    dot: 'bg-gravisima-500',
  },
};

export function getSeverityColor(level: SeverityLevel): SeverityColors {
  return SEVERITY_COLOR_MAP[level];
}
