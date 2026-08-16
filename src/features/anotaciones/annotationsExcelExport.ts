/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SheetData } from 'write-excel-file/browser';
import { maskName, maskRut } from '../../shared/lib/anotacionesUtils';
import {
  getEffectiveDisciplinaryStage,
  type LetterType,
} from '../../shared/lib/domain/disciplinaryStage';
import { matchesAnnotationFilter } from './annotationStudentFilters';

export type AnnotationExportScope =
  'all' | 'visible' | 'sin_carta' | 'amonestacion' | 'compromiso' | 'derivacion';

export interface AnnotationExportStudent {
  id: string;
  full_name: string;
  annotations_count: number;
  positive_annotations_count: number;
  informative_annotations_count?: number;
  last_annotation_date?: string;
  rut?: string;
  course_name?: string;
  effective_letter_type?: LetterType | null;
}

export interface AnnotationExportRow {
  student: string;
  rut: string;
  course: string;
  positives: number;
  negatives: number;
  informatives: number;
  lastRecord: Date | null;
  measure: string;
  documentStatus: string;
}

export const ANNOTATION_EXPORT_OPTIONS: Array<{
  scope: AnnotationExportScope;
  label: string;
}> = [
  { scope: 'all', label: 'Toda la lista' },
  { scope: 'visible', label: 'Resultados visibles' },
  { scope: 'sin_carta', label: 'Sin Carta (1-4 negativas)' },
  { scope: 'amonestacion', label: 'Amonestación' },
  { scope: 'compromiso', label: 'Compromiso conductual' },
  { scope: 'derivacion', label: 'Derivación a convivencia' },
];

const HEADER_STYLE = {
  backgroundColor: '#1E3A5F',
  textColor: '#FFFFFF',
  fontWeight: 'bold' as const,
  align: 'center' as const,
  alignVertical: 'center' as const,
  wrap: true,
  height: 30,
  borderColor: '#CBD5E1',
  borderStyle: 'thin' as const,
};

const CELL_BORDER = {
  borderColor: '#E2E8F0',
  borderStyle: 'thin' as const,
  alignVertical: 'center' as const,
};

export const ANNOTATIONS_EXCEL_COLUMNS = [
  { width: 34 },
  { width: 16 },
  { width: 20 },
  { width: 12 },
  { width: 12 },
  { width: 14 },
  { width: 16 },
  { width: 36 },
  { width: 24 },
];

export function getStudentsForAnnotationExport(
  students: AnnotationExportStudent[],
  visibleStudents: AnnotationExportStudent[],
  scope: AnnotationExportScope,
): AnnotationExportStudent[] {
  if (scope === 'all') return students;
  if (scope === 'visible') return visibleStudents;
  if (scope === 'sin_carta') {
    return students.filter((student) => {
      const negativeCount = Number(student.annotations_count) || 0;
      return negativeCount >= 1 && negativeCount <= 4;
    });
  }

  return students.filter((student) => matchesAnnotationFilter(student, scope));
}

function getAnnotationExportLabel(scope: AnnotationExportScope): string {
  return ANNOTATION_EXPORT_OPTIONS.find((option) => option.scope === scope)?.label ?? 'Anotaciones';
}

export function buildAnnotationExportRows(
  students: AnnotationExportStudent[],
  cartaStatuses: Record<string, string[]>,
  privacyMode: boolean,
): AnnotationExportRow[] {
  return students.map((student) => {
    const lastRecord = student.last_annotation_date ? new Date(student.last_annotation_date) : null;
    const safeLastRecord = lastRecord && !Number.isNaN(lastRecord.getTime()) ? lastRecord : null;

    return {
      student: maskName(student.full_name, privacyMode),
      rut: maskRut(student.rut, privacyMode),
      course: student.course_name || 'Sin curso',
      positives: Number(student.positive_annotations_count) || 0,
      negatives: Number(student.annotations_count) || 0,
      informatives: Number(student.informative_annotations_count) || 0,
      lastRecord: safeLastRecord,
      measure: getEffectiveDisciplinaryStage(
        student.annotations_count,
        student.effective_letter_type,
      ).label,
      documentStatus: cartaStatuses[student.id]?.join(', ') || 'Sin documento',
    };
  });
}

export function buildAnnotationsSheetData(
  rows: AnnotationExportRow[],
  scope: AnnotationExportScope,
  generatedAt: Date,
): SheetData {
  const scopeLabel = getAnnotationExportLabel(scope);
  const emptyCells = Array.from({ length: 8 }, () => null);
  const header = [
    'Estudiante',
    'RUT',
    'Curso',
    'Positivas',
    'Negativas',
    'Informativas',
    'Último registro',
    'Medida disciplinaria',
    'Estado documental',
  ].map((value) => ({ value, ...HEADER_STYLE }));

  const dataRows = rows.map((row, index) => {
    const backgroundColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    const commonStyle = { ...CELL_BORDER, backgroundColor };
    const centeredStyle = { ...commonStyle, align: 'center' as const };

    return [
      { value: row.student, ...commonStyle, wrap: true },
      { value: row.rut, ...commonStyle, format: '@' },
      { value: row.course, ...commonStyle, wrap: true },
      { value: row.positives, ...centeredStyle, format: '#,##0' },
      { value: row.negatives, ...centeredStyle, format: '#,##0' },
      { value: row.informatives, ...centeredStyle, format: '#,##0' },
      row.lastRecord
        ? {
            value: row.lastRecord,
            type: Date,
            format: 'dd/mm/yyyy',
            ...centeredStyle,
          }
        : { value: '—', ...centeredStyle },
      { value: row.measure, ...commonStyle, wrap: true },
      { value: row.documentStatus, ...commonStyle, wrap: true },
    ];
  });

  return [
    [
      {
        value: 'Sistema Integral de Convivencia Escolar — Anotaciones',
        columnSpan: 9,
        backgroundColor: '#0F2742',
        textColor: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 15,
        height: 30,
        alignVertical: 'center',
      },
      ...emptyCells,
    ],
    [
      {
        value: `Alcance: ${scopeLabel} · ${rows.length} estudiante${rows.length === 1 ? '' : 's'} · Generado: ${generatedAt.toLocaleString('es-CL')}`,
        columnSpan: 9,
        backgroundColor: '#E8EEF5',
        textColor: '#334155',
        fontStyle: 'italic',
        height: 24,
        alignVertical: 'center',
      },
      ...emptyCells,
    ],
    header,
    ...dataRows,
  ];
}

export function buildAnnotationExportFileName(
  scope: AnnotationExportScope,
  generatedAt: Date,
): string {
  const date = [
    generatedAt.getFullYear(),
    String(generatedAt.getMonth() + 1).padStart(2, '0'),
    String(generatedAt.getDate()).padStart(2, '0'),
  ].join('-');
  const scopeSlug =
    scope === 'visible' ? 'resultados-visibles' : scope === 'all' ? 'lista-completa' : scope;
  return `anotaciones_${scopeSlug}_${date}.xlsx`;
}

export async function downloadAnnotationsExcel(params: {
  students: AnnotationExportStudent[];
  cartaStatuses: Record<string, string[]>;
  privacyMode: boolean;
  scope: AnnotationExportScope;
  generatedAt?: Date;
}): Promise<void> {
  const generatedAt = params.generatedAt ?? new Date();
  const rows = buildAnnotationExportRows(params.students, params.cartaStatuses, params.privacyMode);
  const sheetData = buildAnnotationsSheetData(rows, params.scope, generatedAt);
  const { default: writeExcelFile } = await import('write-excel-file/browser');

  await writeExcelFile(
    sheetData,
    {
      sheet: 'Anotaciones',
      columns: ANNOTATIONS_EXCEL_COLUMNS,
      orientation: 'landscape',
      stickyRowsCount: 3,
      showGridLines: false,
      zoomScale: 0.9,
    },
    {
      fontFamily: 'Aptos',
      fontSize: 10,
    },
  ).toFile(buildAnnotationExportFileName(params.scope, generatedAt));
}
