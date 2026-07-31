/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileText, RefreshCw, History, Pencil, ScrollText } from 'lucide-react';
import { formatChileDateTime } from '@/src/shared/lib/dateTime';

export interface StudentInfo {
  id: string;
  full_name: string;
  course_id: string;
  teacher_id: string;
  annotations_count?: number;
  positive_annotations_count?: number;
  last_annotation_date?: string;
  disciplinary_status?: string;
  rut?: string;
  course_name?: string;
}

export type ActiveTab = 'estado' | 'editar_anotaciones' | 'revisar_pdf' | 'cartas' | 'historial';

export const SEVERITY_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  Leve: { bg: 'bg-leve-50', text: 'text-leve-700', dot: 'bg-leve-500' },
  Grave: { bg: 'bg-grave-50', text: 'text-grave-700', dot: 'bg-grave-500' },
  'Muy Grave': { bg: 'bg-muygrave-50', text: 'text-muygrave-700', dot: 'bg-muygrave-500' },
  Gravísima: { bg: 'bg-gravisima-50', text: 'text-gravisima-700', dot: 'bg-gravisima-500' },
};

export const STAGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  none: { bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-200' },
  amonestacion: { bg: 'bg-grave-100', text: 'text-grave-700', border: 'border-grave-200' },
  compromiso_conductual: {
    bg: 'bg-muygrave-100',
    text: 'text-muygrave-700',
    border: 'border-muygrave-200',
  },
  derivacion: {
    bg: 'bg-gravisima-100',
    text: 'text-gravisima-700',
    border: 'border-gravisima-200',
  },
};

export const TAB_ICONS: Record<ActiveTab, React.ReactNode> = {
  estado: <FileText className="h-4 w-4" />,
  editar_anotaciones: <Pencil className="h-4 w-4" />,
  revisar_pdf: <RefreshCw className="h-4 w-4" />,
  cartas: <ScrollText className="h-4 w-4" />,
  historial: <History className="h-4 w-4" />,
};

export const TAB_LABELS: Record<ActiveTab, string> = {
  estado: 'Estado',
  editar_anotaciones: 'Editar anotaciones',
  revisar_pdf: 'Revisar PDF',
  cartas: 'Carta',
  historial: 'Historial',
};

export function formatDate(dateStr?: string): string {
  return formatChileDateTime(dateStr, '-');
}
