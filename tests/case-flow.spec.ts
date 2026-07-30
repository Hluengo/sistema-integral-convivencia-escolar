/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from '@playwright/test';

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;

test.describe('Flujo de expedientes', () => {
  test.skip(!staffEmail || !staffPassword, 'Requiere credenciales E2E explícitas.');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.locator('#login-email').fill(staffEmail ?? '');
    await page.locator('#login-password').fill(staffPassword ?? '');
    await page.locator('form button[type="submit"]').click();
    await expect(sidebar.getByText(staffEmail ?? '')).toBeVisible({ timeout: 15_000 });
  });

  test('abre el formulario de un expediente sin modificar datos', async ({ page }) => {
    await page
      .getByRole('button', { name: /crear nueva causa|nueva causa/i })
      .first()
      .click();

    await expect(page.getByRole('heading', { name: /nuevo expediente/i })).toBeVisible();
  });
});
