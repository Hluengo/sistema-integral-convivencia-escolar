/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitPdfPageToWidth } from "./pdfViewerMath";

describe("fitPdfPageToWidth", () => {
  it("escala la pagina al ancho disponible", () => {
    const fit = fitPdfPageToWidth(600, 800, 300, 1);

    assert.equal(fit.cssWidth, 300);
    assert.equal(fit.canvasWidth, 300);
    assert.equal(fit.canvasHeight, 400);
    assert.equal(fit.scale, 0.5);
  });

  it("no amplia la pagina mas alla de su tamaño natural", () => {
    const fit = fitPdfPageToWidth(400, 500, 1200, 1);

    assert.equal(fit.cssWidth, 400);
    assert.equal(fit.canvasWidth, 400);
    assert.equal(fit.canvasHeight, 500);
    assert.equal(fit.scale, 1);
  });

  it("duplica el bitmap cuando la pantalla tiene densidad 2", () => {
    const fit = fitPdfPageToWidth(600, 900, 300, 2);

    assert.equal(fit.cssWidth, 300);
    assert.equal(fit.canvasWidth, 600);
    assert.equal(fit.canvasHeight, 900);
    assert.equal(fit.scale, 1);
  });

  it("acota la densidad a 2 para no consumir memoria de mas", () => {
    const fit = fitPdfPageToWidth(600, 800, 600, 4);

    assert.equal(fit.canvasWidth, 1200);
    assert.equal(fit.canvasHeight, 1600);
  });

  it("tolera medidas invalidas sin devolver canvas de tamaño cero", () => {
    const fit = fitPdfPageToWidth(0, 0, 0, 0);

    assert.equal(fit.cssWidth, 1);
    assert.equal(fit.canvasWidth, 1);
    assert.equal(fit.canvasHeight, 1);
    assert.equal(fit.scale, 1);
  });
});
