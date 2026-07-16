/** @license SPDX-License-Identifier: Apache-2.0 */

import { Paragraph, TextRun, TableCell, TableRow, Table, WidthType, BorderStyle } from 'docx';
import type { BuildDocxParams } from '../types';
import { emptyLine, multiRunPara } from './paragraphs';
import {
  FONT,
  FONT_SIZE_SECTION,
  FONT_SIZE_SMALL,
  FONT_SIZE_BODY,
  FONT_SIZE_TINY,
  COLOR_PRIMARY,
} from '../constants';

export function buildSignatureArea(params: BuildDocxParams): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [];

  parts.push(emptyLine());
  parts.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'FIRMAS',
          font: FONT,
          size: FONT_SIZE_SECTION,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
      alignment: 'center',
      spacing: { before: 200, after: 240 },
    }),
  );
  parts.push(emptyLine());

  // Signature table: two columns
  const coordinatorName = params.coordinatorName ?? 'Coordinador/a de Convivencia Escolar';

  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          // Left column - Coordinator
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '_________________________________',
                    font: FONT,
                    size: FONT_SIZE_BODY,
                    color: '666666',
                  }),
                ],
                alignment: 'center',
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: coordinatorName,
                    font: FONT,
                    size: FONT_SIZE_SMALL,
                    bold: true,
                  }),
                ],
                alignment: 'center',
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Coordinador/a',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                  }),
                ],
                alignment: 'center',
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Direcci\u00F3n de Convivencia Escolar',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                  }),
                ],
                alignment: 'center',
              }),
            ],
          }),
          // Right column - Apoderado
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '_________________________________',
                    font: FONT,
                    size: FONT_SIZE_BODY,
                    color: '666666',
                  }),
                ],
                alignment: 'center',
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: params.apoderadoName,
                    font: FONT,
                    size: FONT_SIZE_SMALL,
                    bold: true,
                  }),
                ],
                alignment: 'center',
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Apoderado/a',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                  }),
                ],
                alignment: 'center',
                spacing: { after: 40 },
              }),
            ],
          }),
        ],
      }),
    ],
  });

  parts.push(sigTable);
  parts.push(emptyLine());
  parts.push(emptyLine());

  // Place and date
  parts.push(
    multiRunPara(
      [
        new TextRun({
          text: 'Santiago, ',
          font: FONT,
          size: FONT_SIZE_SMALL,
          italics: true,
          color: '666666',
        }),
        new TextRun({
          text: params.dateStr,
          font: FONT,
          size: FONT_SIZE_SMALL,
          italics: true,
          color: '666666',
        }),
      ],
      { alignment: 'center' },
    ),
  );

  return parts;
}
