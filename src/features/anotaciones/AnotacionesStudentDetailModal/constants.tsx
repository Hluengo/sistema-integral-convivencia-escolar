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
  Leve: { bg: 'bg-yellow-50', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  Grave: { bg: 'bg-orange-50', text: 'text-orange-800', dot: 'bg-orange-500' },
  'Muy Grave': { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500' },
  Gravísima: { bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-600' },
};

export const STAGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  none: { bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-200' },
  amonestacion: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  compromiso_conductual: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
  },
  derivacion: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
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
