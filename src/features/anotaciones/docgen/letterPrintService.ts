/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Letter Print Service — Servicio unificado para cartas historicas.
 * Renderiza LetterA4Document en un contenedor temporal y usa los mismos
 * mecanismos de exportacion que las cartas nuevas.
 *
 * Para impresion: inyecta CSS inline completo en un HTML autocontenido.
 * Para PDF: usa html-to-image + pdf-lib sobre el nodo renderizado.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Annotation, CartaDisciplinaria } from '@/src/shared/lib/types';
import { supabase } from '@/src/lib/supabase';
import LetterPrintRenderer, { type LetterPrintStudent } from './LetterPrintRenderer';
import { TITLE_MAP, type DocType } from './DocumentPreview/docTypes';
import { toPng } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

const FOLIO_WIDTH_PT = 612.28;
const FOLIO_HEIGHT_PT = 935.43;

/**
 * CSS completo autocontenido para cartas disciplinarias.
 * Incluye todas las clases de letter-document.css como string literal
 * para que funcione en paginas blob: sin dependencia de archivos externos.
 */
const LETTER_DOCUMENT_CSS = `
  .letter-document {
    width: 216mm; min-width: 216mm; height: 330mm; min-height: 330mm;
    box-sizing: border-box; padding: 20mm 25mm; margin: 0;
    background: white; color: #111827;
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-size: 11pt; line-height: 1.5; overflow: hidden; position: relative;
    break-after: page; page-break-after: always;
  }
  .letter-header { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 2px solid #d1d5db; }
  .letter-header-logo { height: 64px; width: auto; flex-shrink: 0; object-fit: contain; }
  .letter-header-text { display: flex; flex-direction: column; }
  .letter-header-institution { font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }
  .letter-header-department { margin-top: 2px; font-size: 12pt; font-weight: 700; color: #1f2937; }
  .letter-header-year { font-size: 11pt; color: #6b7280; }
  .letter-title { margin-bottom: 24px; text-align: center; font-size: 16pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; }
  .letter-section { margin-bottom: 18px; }
  .letter-section-heading { display: flex; align-items: center; gap: 8px; padding-bottom: 4px; margin-bottom: 10px; border-bottom: 2px solid #d1d5db; font-size: 12pt; font-weight: 700; color: #1f2937; }
  .letter-section-number { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex-shrink: 0; border-radius: 50%; background: #1f2937; color: white; font-size: 11pt; font-weight: 700; }
  .letter-section-body { font-size: 10.5pt; line-height: 1.6; color: #374151; }
  .letter-data-row { display: flex; gap: 8px; margin-bottom: 2px; font-size: 10.5pt; line-height: 1.5; }
  .letter-data-label { width: 144px; flex-shrink: 0; font-weight: 600; color: #4b5563; }
  .letter-data-value { color: #1f2937; }
  .letter-signatures { margin-top: 32px; padding-top: 16px; border-top: 1px solid #d1d5db; break-inside: avoid; page-break-inside: avoid; }
  .letter-signatures-title { margin-bottom: 24px; text-align: center; font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; }
  .letter-signatures-grid { display: grid; gap: 16px; font-size: 10pt; color: #4b5563; }
  .letter-signatures-grid-4 { grid-template-columns: repeat(4, 1fr); }
  .letter-signatures-grid-3 { grid-template-columns: repeat(3, 1fr); }
  .letter-signature-item { text-align: center; break-inside: avoid; page-break-inside: avoid; }
  .letter-signature-line { margin-top: 32px; padding-top: 4px; border-top: 1px solid #9ca3af; }
  .letter-signature-role { margin-top: 2px; font-size: 9pt; color: #6b7280; }
  .letter-legal-box { margin-top: 16px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb; }
  .letter-legal-text { font-size: 9pt; line-height: 1.6; color: #6b7280; }
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
    @page { size: 216mm 330mm; margin: 0; }
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

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function captureHistoricalLetter(
  carta: CartaDisciplinaria,
  student?: LetterPrintStudent,
  annotations: Annotation[] = []
): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;background:white;';
  document.body.appendChild(container);

  const root = createRoot(container);
  await new Promise<void>((resolve) => {
    root.render(React.createElement(LetterPrintRenderer, { carta, student, annotations }));
    setTimeout(resolve, 100);
  });

  await document.fonts.ready;
  const letterDocument = container.querySelector('.letter-document') as HTMLElement;
  if (!letterDocument) {
    root.unmount();
    container.remove();
    throw new Error('No se pudo renderizar la carta historica.');
  }

  const images = Array.from(letterDocument.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }
      if (typeof img.decode === 'function') {
        await img.decode().catch(() => undefined);
      }
    })
  );

  return container;
}

function cleanupContainer(container: HTMLElement): void {
  container.remove();
}

export async function recordLetterOutputEvent(
  carta: CartaDisciplinaria,
  action: 'print' | 'download'
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const response = await fetch('/api/usage/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        eventName: action === 'print' ? 'letter_printed' : 'letter_downloaded',
        properties: {
          cartaId: carta.id,
          studentId: carta.student_id,
          letterType: carta.letter_type,
          status: carta.status,
        },
      }),
    });

    if (!response.ok && response.status !== 401) {
      console.warn('No se pudo registrar evento de uso de carta:', response.status);
    }
  } catch (error) {
    console.error('Error registrando evento de carta:', error);
  }
}

export async function printHistoricalCarta(
  carta: CartaDisciplinaria,
  student?: LetterPrintStudent,
  annotations: Annotation[] = []
): Promise<boolean> {
  const html = buildLetterHtml(carta, student, annotations);
  const opened = openPrintWindow(html);
  if (opened) await recordLetterOutputEvent(carta, 'print');
  return opened;
}

export async function downloadHistoricalCartaPdf(
  carta: CartaDisciplinaria,
  student?: LetterPrintStudent,
  annotations: Annotation[] = []
): Promise<boolean> {
  let container: HTMLElement | null = null;
  try {
    container = await captureHistoricalLetter(carta, student, annotations);
    const letterDocument = container.querySelector('.letter-document') as HTMLElement;

    const dataUrl = await toPng(letterDocument, {
      quality: 1.0,
      pixelRatio: 3,
      backgroundColor: '#ffffff',
      cacheBust: true,
      style: {
        transform: 'none',
        transformOrigin: 'top left',
      },
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([FOLIO_WIDTH_PT, FOLIO_HEIGHT_PT]);
    const imageBytes = dataUrlToBytes(dataUrl);
    const image = await pdfDoc.embedPng(imageBytes);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: FOLIO_WIDTH_PT,
      height: FOLIO_HEIGHT_PT,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const studentName = student?.full_name || carta.student_name || 'estudiante';
    const fileName = `${carta.letter_type.replace(/\s+/g, '_')}_${studentName.replace(/\s+/g, '_')}.pdf`;
    saveAs(blob, fileName);

    await recordLetterOutputEvent(carta, 'download');
    return true;
  } catch (error) {
    console.error('Error generando PDF de carta historica:', error);
    return false;
  } finally {
    if (container) cleanupContainer(container);
  }
}

/**
 * @deprecated Usar printLetter() de letterExportService.ts para cartas nuevas.
 * Mantener solo para cartas historicas que usan renderToStaticMarkup.
 */
export function getDocTypeLabel(carta: CartaDisciplinaria): string {
  const docTypeMap: Record<string, DocType> = {
    'Amonestacion Escrita': 'amonestacion',
    'Carta de Compromiso Conductual': 'compromiso_conductual',
    'Ficha de Derivacion': 'derivacion',
  };
  const docType = docTypeMap[carta.letter_type] || 'amonestacion';
  return TITLE_MAP[docType] || carta.letter_type;
}
