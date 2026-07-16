/** @license SPDX-License-Identifier: Apache-2.0 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  type Table,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import {
  FONT,
  FONT_SIZE_SMALL,
  FONT_SIZE_BODY,
  FONT_SIZE_TINY,
  COLOR_ACCENT,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  SCHOOL_NAME,
  DEPT_NAME,
} from './constants';
import type { BuildDocxParams } from './types';
import { documentTitle, multiRunPara, emptyLine } from './helpers/paragraphs';
import { buildHeaderParagraphs } from './templates/header';
import { buildAmonestacionContent } from './templates/amonestacion';
import { buildCompromisoContent } from './templates/compromiso';
import { buildDerivacionContent } from './templates/derivacion';
import { buildSignatureArea } from './helpers/signature';

export async function buildDocx(params: BuildDocxParams): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  // ── Header ──────────────────────────────────────────────────────
  children.push(...buildHeaderParagraphs(params.logoBytes));

  // ── Title ───────────────────────────────────────────────────────
  const titles: Record<string, string> = {
    amonestacion: 'AMONESTACI\u00D3N ESCRITA',
    compromiso_conductual: 'COMPROMISO DE CONVIVENCIA ESCOLAR',
    derivacion: 'DERIVACI\u00D3N A RED DE APOYO',
  };
  children.push(documentTitle(titles[params.docType]));

  // ── Reference line ──────────────────────────────────────────────
  children.push(
    multiRunPara(
      [
        new TextRun({
          text: 'Ref.: ',
          font: FONT,
          size: FONT_SIZE_SMALL,
          bold: true,
          color: '666666',
        }),
        new TextRun({
          text: `${titles[params.docType]} N\u00B0 ${params.dateStr.replace(/\//g, '')}`,
          font: FONT,
          size: FONT_SIZE_SMALL,
          color: '666666',
        }),
      ],
      { alignment: 'left' },
    ),
  );
  children.push(emptyLine());

  // ── Conditional notice for negative count ───────────────────────
  if (params.negativeCount >= 3) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              'NOTA: El/la estudiante acumula ' +
              params.negativeCount +
              ' observaciones negativas, lo que constituye un antecedente ' +
              'relevante para la aplicaci\u00F3n de la presente medida.',
            font: FONT,
            size: FONT_SIZE_SMALL,
            bold: true,
            color: COLOR_ACCENT,
          }),
        ],
        alignment: 'both',
        spacing: { before: 60, after: 200 },
      }),
    );
  }

  // ── Content by document type ────────────────────────────────────
  switch (params.docType) {
    case 'amonestacion':
      children.push(...buildAmonestacionContent(params));
      break;
    case 'compromiso_conductual':
      children.push(...buildCompromisoContent(params));
      break;
    case 'derivacion':
      children.push(...buildDerivacionContent(params));
      break;
  }

  // ── Signature ───────────────────────────────────────────────────
  children.push(...buildSignatureArea(params));

  // ── Build Document ──────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: FONT_SIZE_BODY,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
            },
            margin: {
              top: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
              right: MARGIN,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${SCHOOL_NAME} | ${DEPT_NAME}`,
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                ],
                alignment: 'right',
                spacing: { after: 0 },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'P\u00E1gina ',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                  new TextRun({
                    text: ' de ',
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                  new TextRun({
                    text: `  |  ${params.dateStr}`,
                    font: FONT,
                    size: FONT_SIZE_TINY,
                    color: '999999',
                  }),
                ],
                alignment: 'center',
                spacing: { before: 0, after: 0 },
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
