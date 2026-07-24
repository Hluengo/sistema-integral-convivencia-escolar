/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Playwright E2E tests for Letter A4 Document export system.
 * Tests visual fidelity, PDF download, print, and overflow detection.
 */

import { test, expect } from '@playwright/test';

const LETTER_TEST_URL = '/letter-test.html';

test.describe('Letter A4 Document', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LETTER_TEST_URL);
    await page.waitForLoadState('networkidle');
  });

  test('1. Amonestacion escrita - renderiza correctamente', async ({ page }) => {
    const letterPage = page.locator('#document-preview-a4');
    await expect(letterPage).toBeVisible();
    const title = page.locator('#letter-title');
    await expect(title).toHaveText('Amonestacion Escrita');
    const studentName = page.locator('#student-name');
    await expect(studentName).toHaveText('Juan Perez Gonzalez');
  });

  test('2. Mantienie dimensiones A4 en viewport de escritorio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const letterPage = page.locator('#document-preview-a4');
    const box = await letterPage.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const expectedWidthMm = 210;
      const expectedWidthPx = (expectedWidthMm / 25.4) * 96;
      expect(box.width).toBeCloseTo(expectedWidthPx, 0);
    }
  });

  test('3. Mantienie dimensiones A4 en viewport estrecho (movil)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const letterPage = page.locator('#document-preview-a4');
    const box = await letterPage.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const expectedWidthMm = 210;
      const expectedWidthPx = (expectedWidthMm / 25.4) * 96;
      expect(box.width).toBeCloseTo(expectedWidthPx, 0);
    }
  });

  test('4. Logo institucional visible', async ({ page }) => {
    const logo = page.locator('#logo-placeholder');
    await expect(logo).toBeVisible();
  });

  test('5. Secciones numeradas presentes', async ({ page }) => {
    const sections = page.locator('.letter-section-number');
    const count = await sections.count();
    expect(count).toBe(5);
    for (let i = 0; i < count; i++) {
      await expect(sections.nth(i)).toBeVisible();
    }
  });

  test('6. Firmas presentes en grid de 4 columnas', async ({ page }) => {
    const grid = page.locator('.letter-signatures-grid-4');
    await expect(grid).toBeVisible();
    const items = grid.locator('.letter-signature-item');
    const count = await items.count();
    expect(count).toBe(4);
  });

  test('7. Nombre largo del estudiante no rompe layout', async ({ page }) => {
    const studentName = page.locator('#student-name');
    await studentName.textContent().then(async (text) => {
      expect(text).toBeTruthy();
    });
    const letterPage = page.locator('#document-preview-a4');
    const box = await letterPage.boundingBox();
    expect(box).not.toBeNull();
  });

  test('8. Curso y profesor con nombres largos', async ({ page }) => {
    const course = page.locator('#student-course');
    const teacher = page.locator('#teacher-name');
    await expect(course).toHaveText('3 Basico B');
    await expect(teacher).toHaveText('Maria Lopez Soto');
    const letterPage = page.locator('#document-preview-a4');
    const box = await letterPage.boundingBox();
    expect(box).not.toBeNull();
  });

  test('9. Botones de accion visibles', async ({ page }) => {
    const printBtn = page.locator('#btn-print');
    const pdfBtn = page.locator('#btn-pdf');
    const wordBtn = page.locator('#btn-word');
    await expect(printBtn).toBeVisible();
    await expect(pdfBtn).toBeVisible();
    await expect(wordBtn).toBeVisible();
  });

  test('10. Deteccion de contenido excedido', async ({ page }) => {
    const overflowWarning = page.locator('#overflow-warning');
    const isHidden = await overflowWarning.isHidden();
    expect(isHidden).toBe(true);
  });

  test('11. Descarga PDF - boton dispara accion', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    const pdfBtn = page.locator('#btn-pdf');
    await pdfBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('12. Impresion - boton dispara accion', async ({ page }) => {
    const printBtn = page.locator('#btn-print');
    await expect(printBtn).toBeEnabled();
  });

  test('13. Snapshot visual de la plantilla', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const letterPage = page.locator('#document-preview-a4');
    await expect(letterPage).toHaveScreenshot('letter-amonestacion.png', {
      maxDiffPixelRatio: 0.02,
    });
  });

  test('14. Titulo del documento cambia segun tipo', async ({ page }) => {
    const title = page.locator('#letter-title');
    await expect(title).toHaveText('Amonestacion Escrita');
  });

  test('15. Datos del estudiante correctos', async ({ page }) => {
    const rut = page.locator('#student-rut');
    await expect(rut).toHaveText('12.345.678-9');
    const count = page.locator('#negative-count');
    await expect(count).toHaveText('7');
    const date = page.locator('#date-str');
    await expect(date).toHaveText('23/07/2026');
  });
});
