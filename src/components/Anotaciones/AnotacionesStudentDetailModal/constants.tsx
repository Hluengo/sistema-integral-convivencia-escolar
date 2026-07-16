/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileText, Upload, History, ScrollText } from 'lucide-react';

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

export interface DisciplinayRecord {
  id: string;
  step_number?: number;
  stage_name?: string;
  transition_date?: string;
  responsible?: string;
  comment?: string | null;
  from?: string;
  to?: string;
  date?: string;
  estado_actual?: string;
  tipo_infraccion?: string;
  fecha_ultima_actualizacion?: string;
}

export type ActiveTab = 'resumen' | 'subir_pdf' | 'historial' | 'documentos';

export const SEVERITY_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  Leve: { bg: 'bg-yellow-50', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  Grave: { bg: 'bg-orange-50', text: 'text-orange-800', dot: 'bg-orange-500' },
  'Muy Grave': { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500' },
  'Gravísima': { bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-600' },
};

export const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  Verde: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Verde - Buen Comportamiento' },
  Amarillo: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Amarillo - Advertencia' },
  Naranja: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Naranja - Compromiso' },
  Rojo: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'Rojo - Alerta Crítica' },
};

export const TAB_ICONS: Record<ActiveTab, React.ReactNode> = {
  resumen: <FileText className="h-4 w-4" />,
  subir_pdf: <Upload className="h-4 w-4" />,
  historial: <History className="h-4 w-4" />,
  documentos: <ScrollText className="h-4 w-4" />,
};

export const TAB_LABELS: Record<ActiveTab, string> = {
  resumen: 'Ficha / Resumen',
  subir_pdf: 'Subir PDF',
  historial: 'Historial',
  documentos: 'Documentos',
};

export function formatDate(dateStr?: string): string {
  if (!dateStr) { return '-'; }
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
