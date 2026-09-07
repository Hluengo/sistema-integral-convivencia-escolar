/** @license SPDX-License-Identifier: Apache-2.0 */

/** Papel carta (216 x 279 mm) para documentos oficiales. */
export const CARTA_PAGE_STYLE = `
  @page {
    size: 216mm 279mm;
    margin: 0;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    width: 216mm;
  }
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .letter-document {
    margin: 0 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    transform: none !important;
  }
`;

/** Papel oficio (216 x 330 mm) para borradores. */
export const OFICIO_PAGE_STYLE = `@page { size: 216mm 330mm; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`;
