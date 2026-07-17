/** @license SPDX-License-Identifier: Apache-2.0 */

import { Paragraph, TextRun, ImageRun } from 'docx';
import {
  FONT,
  FONT_SIZE_SUBTITLE,
  FONT_SIZE_BODY,
  FONT_SIZE_TINY,
  COLOR_PRIMARY,
  COLOR_ACCENT,
  SCHOOL_NAME,
  DEPT_NAME,
} from '../constants';

export function buildHeaderParagraphs(logoBytes?: Uint8Array): Paragraph[] {
  const result: Paragraph[] = [];

  if (logoBytes) {
    result.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: logoBytes,
            transformation: { width: 80, height: 80 },
            type: 'png',
          }),
        ],
        alignment: 'center',
        spacing: { after: 100 },
      }),
    );
  }

  result.push(
    new Paragraph({
      children: [
        new TextRun({
          text: SCHOOL_NAME,
          font: FONT,
          size: FONT_SIZE_SUBTITLE,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
      alignment: 'center',
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: DEPT_NAME,
          font: FONT,
          size: FONT_SIZE_BODY,
          bold: true,
          color: COLOR_ACCENT,
        }),
      ],
      alignment: 'center',
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '_______________________________________________________________________________',
          font: FONT,
          size: FONT_SIZE_TINY,
          color: '999999',
        }),
      ],
      alignment: 'center',
      spacing: { after: 200 },
    }),
  );

  return result;
}
