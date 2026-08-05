/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from '@playwright/test';
import { dismissWelcome, hasStaffCredentials, loginAsStaff } from './helpers';

test.describe('Navegación por URL', () => {
  test('abre el login desde /login y vuelve al dashboard al cerrar', async ({ page }) => {
    await page.addInitScript(() =>
      window.sessionStorage.setItem('gestion-casos-welcome-seen', 'true'),
    );
    await page.goto('/login');

    await expect(page.locator('#login-email')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });

  test('redirige rutas desconocidas al dashboard público', async ({ page }) => {
    await page.goto('/ruta-inexistente');
    await dismissWelcome(page);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15_000 });
  });

  test('mantiene una sola navegación lateral accesible en escritorio', async ({ page }) => {
    test.skip(!hasStaffCredentials, 'Requiere credenciales E2E explícitas.');

    await loginAsStaff(page);

    await expect(page.getByRole('button', { name: /^Causas(?:\s+\d+)?$/i })).toHaveCount(1);
  });

  test('enmascara nombres en etiquetas accesibles de anotaciones con privacidad activa', async ({
    page,
  }) => {
    test.skip(!hasStaffCredentials, 'Requiere credenciales E2E explícitas.');

    await loginAsStaff(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /anotaciones/i }).click();

    await page.getByRole('button', { name: 'Activar modo privacidad' }).click();
    await expect(page.getByRole('button', { name: 'Desactivar modo privacidad' })).toBeVisible();

    const detailRows = page.getByRole('button', { name: /^Ver detalle de estudiante \d+$/ });
    await expect(detailRows.first()).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('button', { name: /^Ver detalle de (?!estudiante \d+$).+/ }),
    ).toHaveCount(0);
  });
});
