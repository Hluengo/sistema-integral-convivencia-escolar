/** @license SPDX-License-Identifier: Apache-2.0 */

export interface PdfPageFit {
  /** Ancho CSS de la pagina dentro del contenedor. */
  cssWidth: number;
  /** Ancho del bitmap del canvas (CSS x densidad). */
  canvasWidth: number;
  /** Alto del bitmap del canvas (proporcional a la pagina). */
  canvasHeight: number;
  /** Escala aplicada al viewport de pdf.js. */
  scale: number;
}

/**
 * Ajusta una pagina PDF al ancho disponible del contenedor.
 *
 * El canvas se dibuja a `cssWidth * densidad` para que el texto se vea nitido
 * en pantallas retina, pero nunca se amplia mas alla del tamaño natural de la
 * pagina ni se permite una densidad desmedida que dispare la memoria.
 */
export function fitPdfPageToWidth(
  pageWidth: number,
  pageHeight: number,
  availableWidth: number,
  devicePixelRatio = 1,
): PdfPageFit {
  const safePageWidth = Math.max(1, pageWidth);
  const safePageHeight = Math.max(1, pageHeight);
  const safeAvailableWidth = Math.max(1, availableWidth);
  const density = Math.min(Math.max(devicePixelRatio || 1, 1), 2);

  const cssWidth = Math.min(safePageWidth, safeAvailableWidth);
  const scale = (cssWidth / safePageWidth) * density;

  return {
    cssWidth: Math.max(1, Math.round(cssWidth)),
    canvasWidth: Math.max(1, Math.round(safePageWidth * scale)),
    canvasHeight: Math.max(1, Math.round(safePageHeight * scale)),
    scale,
  };
}
