/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import writeExcelFile from 'write-excel-file/node';
import {
  ANNOTATIONS_EXCEL_COLUMNS,
  buildAnnotationExportFileName,
  buildAnnotationExportRows,
  buildAnnotationsSheetData,
  getStudentsForAnnotationExport,
  type AnnotationExportStudent,
} from './annotationsExcelExport';

const students: AnnotationExportStudent[] = [
  {
    id: 'student-1',
    full_name: 'ANA MARÍA PÉREZ SOTO',
    rut: '12.345.678-9',
    course_name: '1° Medio A',
    annotations_count: 7,
    positive_annotations_count: 2,
    informative_annotations_count: 1,
    last_annotation_date: '2026-07-27T12:00:00.000Z',
  },
  {
    id: 'student-2',
    full_name: 'JUAN SILVA',
    rut: '11.111.111-1',
    course_name: '2° Medio B',
    annotations_count: 12,
    positive_annotations_count: 1,
  },
  {
    id: 'student-3',
    full_name: 'SOFÍA ROJAS',
    rut: '22.222.222-2',
    course_name: '3° Medio A',
    annotations_count: 17,
    positive_annotations_count: 0,
  },
];

describe('annotationsExcelExport', () => {
  it('exporta como Sin Carta solo estudiantes con 1 a 4 anotaciones negativas', () => {
    const sinCartaStudents: AnnotationExportStudent[] = [
      {
        id: 'student-0',
        full_name: 'SIN ANOTACIONES',
        annotations_count: 0,
        positive_annotations_count: 0,
      },
      {
        id: 'student-1-negative',
        full_name: 'UNA NEGATIVA',
        annotations_count: 1,
        positive_annotations_count: 0,
      },
      {
        id: 'student-4-negative',
        full_name: 'CUATRO NEGATIVAS',
        annotations_count: 4,
        positive_annotations_count: 0,
      },
      {
        id: 'student-5-negative',
        full_name: 'CINCO NEGATIVAS',
        annotations_count: 5,
        positive_annotations_count: 0,
      },
    ];

    expect(getStudentsForAnnotationExport(sinCartaStudents, [], 'sin_carta')).toEqual([
      sinCartaStudents[1],
      sinCartaStudents[2],
    ]);
  });

  it('selecciona estudiantes según el tipo de carta', () => {
    expect(getStudentsForAnnotationExport(students, [students[0]], 'visible')).toEqual([
      students[0],
    ]);
    expect(getStudentsForAnnotationExport(students, [], 'amonestacion')).toEqual([students[0]]);
    expect(getStudentsForAnnotationExport(students, [], 'compromiso')).toEqual([students[1]]);
    expect(getStudentsForAnnotationExport(students, [], 'derivacion')).toEqual([students[2]]);
  });

  it('exporta como Derivación una carta procesada aunque el conteo permanezca en 14', () => {
    const processedDerivation: AnnotationExportStudent = {
      id: 'student-derivation',
      full_name: 'ESTUDIANTE CON DERIVACIÓN',
      annotations_count: 14,
      positive_annotations_count: 0,
      effective_letter_type: 'Ficha de Derivación',
    };

    expect(getStudentsForAnnotationExport([processedDerivation], [], 'derivacion')).toEqual([
      processedDerivation,
    ]);
    expect(
      buildAnnotationExportRows(
        [processedDerivation],
        { 'student-derivation': ['Procesada'] },
        false,
      )[0],
    ).toMatchObject({
      measure: 'Derivación a Convivencia Escolar',
      documentStatus: 'Procesada',
    });
  });

  it('respeta el modo privacidad y conserva valores numéricos y fechas', () => {
    const [row] = buildAnnotationExportRows([students[0]], { 'student-1': ['Vigente'] }, true);

    expect(row.student).not.toBe(students[0].full_name);
    expect(row.rut).toBe('12.345.***-*');
    expect(row.negatives).toBe(7);
    expect(row.lastRecord).toBeInstanceOf(Date);
    expect(row.measure).toBe('Amonestación Escrita');
    expect(row.documentStatus).toBe('Vigente');
  });

  it('produce un libro XLSX válido con cabecera y filas', async () => {
    const rows = buildAnnotationExportRows(students, {}, false);
    const sheetData = buildAnnotationsSheetData(rows, 'all', new Date('2026-07-27T12:00:00.000Z'));
    const buffer = await writeExcelFile(
      sheetData,
      {
        sheet: 'Anotaciones',
        columns: ANNOTATIONS_EXCEL_COLUMNS,
        stickyRowsCount: 3,
      },
      { fontFamily: 'Aptos', fontSize: 10 },
    ).toBuffer();

    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(sheetData).toHaveLength(6);
    expect(buildAnnotationExportFileName('all', new Date(2026, 6, 27))).toBe(
      'anotaciones_lista-completa_2026-07-27.xlsx',
    );
    expect(buildAnnotationExportFileName('sin_carta', new Date(2026, 6, 27))).toBe(
      'anotaciones_sin_carta_2026-07-27.xlsx',
    );
  });
});
