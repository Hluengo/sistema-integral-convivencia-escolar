/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Letter Export Service — Servicio unico de exportacion para cartas disciplinarias.
 * Proporciona impresion y descarga PDF desde el componente LetterA4Document.
 */

import { toPng } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const CAPTURE_SCALE = 2;

export interface LetterExportOptions {
  docType: string;
  studentName: string;
  dateStr?: string;
}

export interface LetterExportResult {
  success: boolean;
  error?: string;
}

async function waitForFonts(): Promise<void> {
  if (typeof document === 'undefined') return;
  await document.fonts.ready;
}

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
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
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 100);
}

function buildFileName(options: LetterExportOptions): string {
  const tipo = sanitizeFileName(options.docType);
  const estudiante = sanitizeFileName(options.studentName);
  const fecha = options.dateStr || new Date().toISOString().split('T')[0];
  return `Carta_${tipo}_${estudiante}_${fecha}.pdf`;
}

export function checkOverflow(element: HTMLElement): boolean {
  const tolerance = 2;
  return element.scrollHeight > element.clientHeight + tolerance;
}

async function captureNodeAsImage(element: HTMLElement): Promise<string> {
  const dataUrl = await toPng(element, {
    quality: 1.0,
    pixelRatio: CAPTURE_SCALE,
    backgroundColor: '#ffffff',
    style: {
      transform: 'none',
      transformOrigin: 'top left',
    },
    filter: (node: HTMLElement) => {
      const isButton = node.tagName === 'BUTTON';
      const isControl = node.getAttribute('role') === 'button';
      return !isButton && !isControl;
    },
  });
  return dataUrl;
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

async function createPdfFromImage(imageDataUrl: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  const imageBytes = dataUrlToBytes(imageDataUrl);
  const image = await pdfDoc.embedPng(imageBytes);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: A4_WIDTH_PT,
    height: A4_HEIGHT_PT,
  });
  return pdfDoc.save();
}

async function prepareElement(element: HTMLElement): Promise<void> {
  await waitForFonts();
  await waitForImages(element);
}

function getDocumentStyles(): string {
  return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join('\n');
}

function buildPrintHtml(markup: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Imprimir carta</title>
  ${getDocumentStyles()}
  <style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; width: 210mm; background: white; }
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

/**
 * Imprime una carta usando un iframe oculto con la plantilla canonic.
 */
export async function printLetter(
  element: HTMLElement,
  _options: LetterExportOptions
): Promise<LetterExportResult> {
  try {
    await prepareElement(element);
    const markup = element.outerHTML;
    const html = buildPrintHtml(markup);
    const opened = openPrintWindow(html);
    if (!opened) {
      return {
        success: false,
        error: 'El navegador bloqueo la ventana de impresion. Permita ventanas emergentes.',
      };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido al preparar la impresion.',
    };
  }
}

/**
 * Descarga un PDF real generado desde el nodo LetterA4Document.
 * No abre el dialogo de impresion.
 */
export async function downloadLetterPdf(
  element: HTMLElement,
  options: LetterExportOptions
): Promise<LetterExportResult> {
  try {
    await prepareElement(element);

    if (checkOverflow(element)) {
      return {
        success: false,
        error:
          'El contenido supera una pagina A4. Reduzca el texto o utilice una version de varias paginas antes de imprimir o descargar.',
      };
    }

    const imageDataUrl = await captureNodeAsImage(element);
    const pdfBytes = await createPdfFromImage(imageDataUrl);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const fileName = buildFileName(options);
    saveAs(blob, fileName);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido al generar el PDF.',
    };
  }
}
