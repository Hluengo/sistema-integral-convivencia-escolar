/** @license SPDX-License-Identifier: Apache-2.0 */

import { Paragraph, TextRun } from 'docx';
import {
  FONT,
  FONT_SIZE_BODY,
  FONT_SIZE_SECTION,
  FONT_SIZE_TITLE,
  COLOR_PRIMARY,
} from '../constants';

export function bodyPara(
  text: string,
  opts?: {
    bold?: boolean;
    size?: number;
    alignment?: 'left' | 'center' | 'right' | 'both' | 'end' | 'start' | 'distribute';
    color?: string;
    spacingBefore?: number;
    spacingAfter?: number;
  },
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts?.size ?? FONT_SIZE_BODY,
        bold: opts?.bold ?? false,
        color: opts?.color,
      }),
    ],
    alignment: opts?.alignment ?? 'both',
    spacing: {
      before: opts?.spacingBefore ?? 0,
      after: opts?.spacingAfter ?? 120,
      line: 276, // ~1.15 line spacing
    },
  });
}

export function multiRunPara(
  runs: TextRun[],
  opts?: {
    alignment?: 'left' | 'center' | 'right' | 'both' | 'end' | 'start' | 'distribute';
    spacingBefore?: number;
    spacingAfter?: number;
  },
): Paragraph {
  return new Paragraph({
    children: runs,
    alignment: opts?.alignment ?? 'left',
    spacing: {
      before: opts?.spacingBefore ?? 0,
      after: opts?.spacingAfter ?? 120,
      line: 276,
    },
  });
}

export function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: FONT_SIZE_SECTION,
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
    alignment: 'left',
    spacing: { before: 280, after: 120, line: 276 },
  });
}

export function documentTitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: FONT_SIZE_TITLE,
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
    alignment: 'center',
    spacing: { before: 200, after: 320, line: 276 },
  });
}

export function emptyLine(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '', font: FONT, size: FONT_SIZE_BODY })],
    spacing: { before: 0, after: 0 },
  });
}
