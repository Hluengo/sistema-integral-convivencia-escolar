/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Letter Print Service — Servicio para impresion de cartas historicas.
 * Renderiza LetterA4Document en un contenedor temporal de HTML autocontenido.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Annotation, CartaDisciplinaria } from '@/src/shared/lib/types';
import LetterPrintRenderer, { type LetterPrintStudent } from './LetterPrintRenderer';
import { TITLE_MAP, type DocType } from './DocumentPreview/docTypes';

/**
 * CSS completo autocontenido para cartas disciplinarias Carta (216x279mm).
 */
const LETTER_DOCUMENT_CSS = `
  .letter-document {
    width: 216mm; min-width: 216mm; height: 279mm; min-height: 279mm;
    box-sizing: border-box; padding: 15mm; margin: 0;
    background: white; color: #111827;
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-size: 10pt; line-height: 1.5; overflow: hidden; position: relative;
    break-after: page; page-break-after: always;
  }
  .letter-header { display: flex; align-items: center; gap: 14px; padding-bottom: 10px; margin-bottom: 3mm; border-bottom: 2px solid #d1d5db; }
  .letter-header-logo { height: 60px; width: auto; flex-shrink: 0; object-fit: contain; }
  .letter-header-text { display: flex; flex-direction: column; }
  .letter-header-institution { font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }
  .letter-header-department { margin-top: 2px; font-size: 11pt; font-weight: 700; color: #1f2937; }
  .letter-header-year { font-size: 10pt; color: #6b7280; }
  .letter-title { margin-bottom: 3mm; text-align: center; font-size: 14pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; }
  .letter-section { margin-bottom: 3mm; }
  .letter-section-heading { display: flex; align-items: center; gap: 8px; padding-bottom: 2px; margin-bottom: 1.5mm; border-bottom: 2px solid #d1d5db; font-size: 11pt; font-weight: 700; color: #1f2937; }
  .letter-section-number { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex-shrink: 0; border-radius: 50%; background: #1f2937; color: white; font-size: 10pt; font-weight: 700; }
  .letter-section-body { font-size: 9.5pt; line-height: 1.4; text-align: justify; color: #374151; }
  .letter-data-row { display: flex; gap: 6px; margin-bottom: 2px; font-size: 9.5pt; line-height: 1.5; }
  .letter-data-label { width: 130px; flex-shrink: 0; font-weight: 600; color: #4b5563; }
  .letter-data-value { color: #1f2937; }
  .letter-metadata-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); column-gap: 10mm; row-gap: 1.5mm; margin-top: 1.5mm; margin-bottom: 2.5mm; align-items: start; }
  .letter-metadata-item { display: grid; grid-template-columns: 36mm minmax(0,1fr); column-gap: 2mm; min-width: 0; align-items: start; font-size: 8.5pt; line-height: 1.25; }
  .letter-metadata-item--full { grid-column: 1 / -1; }
  .letter-metadata-label { font-weight: 600; color: #4b5563; line-height: 1.25; }
  .letter-metadata-value { min-width: 0; overflow-wrap: anywhere; line-height: 1.25; color: #1f2937; }
  .letter-signatures { margin-top: 18px; padding-top: 10px; border-top: 1px solid #d1d5db; break-inside: avoid; page-break-inside: avoid; }
  .letter-signatures-title { margin-bottom: 14px; text-align: center; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; }
  .letter-signature-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 3mm; font-size: 9pt; color: #4b5563; }
  .letter-signature-item { text-align: center; break-inside: avoid; page-break-inside: avoid; min-width: 0; }
  .letter-signature-line { margin-top: 20px; padding-top: 4px; border-top: 1px solid #9ca3af; overflow-wrap: anywhere; word-break: break-word; }
  .letter-signature-role { margin-top: 2px; font-size: 8pt; color: #6b7280; }
  .letter-legal-box { margin-top: 14px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb; }
  .letter-legal-text { font-size: 8pt; line-height: 1.6; color: #6b7280; }
`;

function buildLetterHtml(
  carta: CartaDisciplinaria,
  student?: LetterPrintStudent,
  annotations: Annotation[] = []
): string {
  const markup = renderToStaticMarkup(
    React.createElement(LetterPrintRenderer, { carta, student, annotations })
  );
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${carta.letter_type}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    ${LETTER_DOCUMENT_CSS}
    @page { size: 216mm 279mm; margin: 0; }
    html, body { margin: 0; padding: 0; width: 216mm; background: white; }
    body { display: flex; justify-content: center; color: #111827; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>${markup}</body>
</html>`;
}

function openPrintWindow(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    return false;
  }
  const timer = window.setInterval(() => {
    try {
      if (win.document.readyState === 'complete') {
        window.clearInterval(timer);
        win.print();
        URL.revokeObjectURL(url);
      }
    } catch {
      window.clearInterval(timer);
      URL.revokeObjectURL(url);
    }
  }, 100);
  window.setTimeout(() => {
    window.clearInterval(timer);
    URL.revokeObjectURL(url);
  }, 10000);
  return true;
}

export async function printHistoricalCarta(
  carta: CartaDisciplinaria,
  student?: LetterPrintStudent,
  annotations: Annotation[] = []
): Promise<boolean> {
  const html = buildLetterHtml(carta, student, annotations);
  return openPrintWindow(html);
}

export function getDocTypeLabel(carta: CartaDisciplinaria): string {
  const docTypeMap: Record<string, DocType> = {
    'Amonestacion Escrita': 'amonestacion',
    'Carta de Compromiso Conductual': 'compromiso_conductual',
    'Ficha de Derivacion': 'derivacion',
  };
  const docType = docTypeMap[carta.letter_type] || 'amonestacion';
  return TITLE_MAP[docType] || carta.letter_type;
}
