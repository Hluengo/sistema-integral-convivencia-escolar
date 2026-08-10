/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from '@playwright/test';
import { hasStaffCredentials, loginAsStaff } from './helpers';

/**
 * Revisión E2E de la Notificación de Inicio de Indagación:
 * 1) el hito chk_rec_3 (Recepción) expone el generador propio (sin IA) y no
 *    el registro genérico de hitos;
 * 2) el DraftPanel (redacción asistida) ya no ofrece la notificación de
 *    apertura y deriva la edición al checklist.
 *
 * Los tests son de solo lectura: no se persisten documentos ni se marca como
 * notificada, para no alterar los datos del entorno E2E.
 */
test.describe('Notificación de Inicio de Indagación (E2E)', () => {
  test.skip(!hasStaffCredentials, 'Requiere credenciales E2E explícitas.');

  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test('el hito chk_rec_3 muestra el generador de la notificación en la fase Recepción', async ({
    page,
  }) => {
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /causas/i }).click();

    const manageButton = page.getByRole('button', { name: /Gestionar expediente/i }).first();
    await expect(manageButton).toBeVisible({ timeout: 20_000 });
    await manageButton.click();
    await expect(page).toHaveURL(/\/expedientes\/[^/?#]+$/);

    // Abre la ruta del expediente y la fase de Recepción.
    await page.getByRole('tab', { name: 'Ruta del expediente' }).click();
    await page.getByRole('button', { name: /Trabajar hitos de Recepción/ }).click();
    await page.getByRole('button', { name: 'Abrir hitos de 1. Recepción y Apertura' }).click();

    // El hito chk_rec_3 existe con su etiqueta oficial.
    const hito = page.getByText('Notificación de Inicio de Indagación', { exact: true }).first();
    await expect(hito).toBeVisible({ timeout: 10_000 });

    // El generador expone el título del documento y la impresión Carta.
    await expect(page.getByRole('button', { name: /^Imprimir/ }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Estado del documento: badge de estado si ya existe un documento
    // persistido, o aviso de plantilla editable si aún no (entorno E2E de
    // solo lectura que no persiste documentos).
    const statusBadge = page.getByText(/estado:/i);
    const editableHint = page.getByText(/plantilla editable/i);
    const hasDocumentState = (await statusBadge.count()) > 0 || (await editableHint.count()) > 0;
    expect(hasDocumentState).toBe(true);
  });

  test('el generador reemplaza el registro genérico en chk_rec_3', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /causas/i }).click();

    const manageButton = page.getByRole('button', { name: /Gestionar expediente/i }).first();
    await expect(manageButton).toBeVisible({ timeout: 20_000 });
    await manageButton.click();

    await page.getByRole('tab', { name: 'Ruta del expediente' }).click();
    await page.getByRole('button', { name: /Trabajar hitos de Recepción/ }).click();
    await page.getByRole('button', { name: 'Abrir hitos de 1. Recepción y Apertura' }).click();

    // El bloque del hito chk_rec_3 contiene el generador (Guardar borrador o
    // Marcar como notificada, según el estado persistido del documento).
    const panel = page.locator('#notificacion-preview-letter').first();
    await expect(panel).toBeVisible({ timeout: 10_000 });

    const saveButton = page.getByRole('button', { name: /Guardar borrador/i });
    const markButton = page.getByRole('button', { name: /Marcar como notificada/i });
    const statusText = page.getByText(/documento notificado|documento anulado/i);

    const hasGeneratorActions = (await saveButton.count()) > 0 || (await markButton.count()) > 0;
    const hasFinalState = (await statusText.count()) > 0;
    expect(hasGeneratorActions || hasFinalState).toBe(true);

    // Con la plantilla base compacta el contenido cabe en una sola hoja Carta:
    // el aviso de desbordamiento no debe aparecer mientras el documento está
    // pendiente (un snapshot persistido antiguo podría desbordar legítimamente,
    // por eso la aserción solo aplica al estado editable).
    if (hasGeneratorActions) {
      await expect(page.getByText(/El contenido supera una hoja Carta/)).toHaveCount(0);
    }

    // El membrete y el bloque de firmas son propios de la indagación: el
    // encargado figura como "Encargado de Indagación" (header y firma) y el
    // bloque de firmas no lleva el título genérico "Firmas".
    const letter = page.locator('#notificacion-preview-letter');
    await expect(letter.getByText('ENCARGADO DE INDAGACIÓN', { exact: true })).toHaveCount(1);
    await expect(letter.getByText('Encargado de Indagación', { exact: true })).toHaveCount(1);
    await expect(letter.getByText('Firmas', { exact: true })).toHaveCount(0);
  });

  test('el DraftPanel solo ofrece informes en redacción asistida', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /asistente legal/i }).click();

    await page.getByRole('tab', { name: 'Redacción documentos' }).click();

    // Selecciona un expediente para habilitar la redacción.
    const caseSelector = page.locator('#legal-case-selector');
    await expect(caseSelector).toBeVisible({ timeout: 15_000 });
    const firstOptionValue = await caseSelector.locator('option').nth(1).getAttribute('value');
    expect(firstOptionValue).toBeTruthy();
    await caseSelector.selectOption(firstOptionValue!);

    const docTypeSelect = page.locator('#doc-type');
    await expect(docTypeSelect).toBeVisible({ timeout: 15_000 });

    // La redacción asistida queda limitada a informes.
    await expect(docTypeSelect.locator('option')).toHaveCount(2);
    await expect(docTypeSelect.locator('option[value="informe_cierre_indagacion"]')).toHaveCount(1);
    await expect(docTypeSelect.locator('option[value="informe_concluyente"]')).toHaveCount(1);

    // El aviso dirige la notificación al checklist de Recepción.
    await expect(
      page.getByText(/se genera desde el hito del checklist de Recepción/i),
    ).toBeVisible();
  });
});
