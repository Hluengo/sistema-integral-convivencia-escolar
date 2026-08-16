/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from '@playwright/test';
import { hasStaffCredentials, loginAsStaff } from './helpers';

test.describe('Flujo de expedientes', () => {
  test.skip(!hasStaffCredentials, 'Requiere credenciales E2E explícitas.');

  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test('abre el formulario de un expediente sin modificar datos', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /causas/i }).click();

    await page
      .getByRole('button', { name: /crear nueva causa|nueva causa/i })
      .first()
      .click();

    await expect(page.getByRole('heading', { name: /nuevo expediente/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('valida el formulario de nuevo expediente sin guardar datos incompletos', async ({
    page,
  }) => {
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /causas/i }).click();

    await page
      .getByRole('button', { name: /crear nueva causa|nueva causa/i })
      .first()
      .click();
    await page.getByRole('button', { name: 'Registrar Expediente' }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'Seleccione un curso.' })).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Ingrese el nombre del estudiante.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Ingrese un RUN chileno válido.' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: 'Describa los hechos con al menos 10 caracteres.' }),
    ).toBeVisible();
  });

  test('abre un expediente desde el listado y mantiene la URL profunda', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /causas/i }).click();

    const manageButton = page.getByRole('button', { name: /Gestionar expediente/i }).first();
    await expect(manageButton).toBeVisible({ timeout: 20_000 });
    await manageButton.click();

    await expect(page).toHaveURL(/\/expedientes\/[^/?#]+$/);
  });

  test('activa modo privacidad en expedientes y oculta RUN visibles', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /causas/i }).click();

    await page.getByRole('button', { name: 'Activar modo privacidad' }).click();

    await expect(page.getByRole('button', { name: 'Desactivar modo privacidad' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/\d{1,2}\.\d{3}\.\d{3}-[\dkK]/);
  });
});
