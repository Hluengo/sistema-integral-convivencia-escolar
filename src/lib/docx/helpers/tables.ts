/** @license SPDX-License-Identifier: Apache-2.0 */

import { WidthType, BorderStyle, Table, TableRow, TableCell, Paragraph, TextRun } from 'docx';
import { FONT, FONT_SIZE_BODY } from '../constants';

export function borderedCell(text: string, opts?: { bold?: boolean; width?: number }): TableCell {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT,
            size: FONT_SIZE_BODY,
            bold: opts?.bold ?? false,
          }),
        ],
        spacing: { before: 60, after: 60 },
      }),
    ],
  });
}

export function dataTable(rows: Array<[string, string]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '999999' },
    },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            borderedCell(label, { bold: true, width: 2600 }),
            borderedCell(value, { width: 6400 }),
          ],
        }),
    ),
  });
}
