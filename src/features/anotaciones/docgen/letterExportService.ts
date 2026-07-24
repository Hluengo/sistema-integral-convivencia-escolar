/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Letter Export Service — Servicio unico de exportacion para cartas disciplinarias.
 * Proporciona descarga PDF desde el componente LetterA4Document.
 *
 * Usa contenedor temporal off-screen para capturar el documento fuera del
 * contexto del <dialog> nativo, donde html-to-image no funciona correctamente.
 */

import { toPng } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

const FOLIO_WIDTH_PT = 612.28;
const FOLIO_HEIGHT_PT = 935.43;
const CAPTURE_SCALE = 3;

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
  const page = pdfDoc.addPage([FOLIO_WIDTH_PT, FOLIO_HEIGHT_PT]);
  const imageBytes = dataUrlToBytes(imageDataUrl);
  const image = await pdfDoc.embedPng(imageBytes);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: FOLIO_WIDTH_PT,
    height: FOLIO_HEIGHT_PT,
  });
  return pdfDoc.save();
}

/**
 * Captura un elemento como PNG usando un contenedor temporal off-screen.
 * Esto es necesario porque html-to-image no puede capturar correctamente
 * contenido dentro de un <dialog> nativo (top layer context).
 */
async function captureElementOffScreen(element: HTMLElement): Promise<string> {
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:216mm;background:white;overflow:hidden;';
  document.body.appendChild(container);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.cssText =
    'width:216mm;height:330mm;margin:0;padding:20mm 25mm;transform:none;box-shadow:none;border:none;border-radius:0;';
  container.appendChild(clone);

  await waitForFonts();
  await waitForImages(clone);

  const dataUrl = await toPng(clone, {
    quality: 1.0,
    pixelRatio: CAPTURE_SCALE,
    backgroundColor: '#ffffff',
    cacheBust: true,
    style: {
      width: '216mm',
      height: '330mm',
      transform: 'none',
      transformOrigin: 'top left',
      boxShadow: 'none',
      borderRadius: '0',
    },
    filter: (node: HTMLElement) => {
      const isButton = node.tagName === 'BUTTON';
      const isControl = node.getAttribute('role') === 'button';
      return !isButton && !isControl;
    },
  });

  container.remove();
  return dataUrl;
}

/**
 * Descarga un PDF real generado desde el nodo LetterA4Document.
 * No abre el dialogo de impresion.
 *
 * Flujo:
 * 1. Clona el nodo .letter-document en un contenedor temporal off-screen
 * 2. Captura como PNG de alta resolucion
 * 3. Genera un PDF Oficio (216x330mm) con pdf-lib
 * 4. Descarga el archivo via file-saver
 */
export async function downloadLetterPdf(
  element: HTMLElement,
  options: LetterExportOptions
): Promise<LetterExportResult> {
  try {
    if (checkOverflow(element)) {
      return {
        success: false,
        error:
          'El contenido supera una pagina Oficio (216 x 330 mm). Reduzca el texto o utilice una version de varias paginas antes de imprimir o descargar.',
      };
    }

    const letterDocument =
      (element.querySelector('.letter-document') as HTMLElement | null) || element;
    const imageDataUrl = await captureElementOffScreen(letterDocument);
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
