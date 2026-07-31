/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from '@playwright/test';

test.describe('Aplicación pública', () => {
  test('muestra la navegación y el contenido principal', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('complementary', { name: 'Barra de navegación principal' }),
    ).toBeVisible();
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });

  test('permite abrir el inicio de sesión y muestra un error profesional', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });

    await sidebar.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.locator('#login-email').fill('cuenta-inexistente@colegio.cl');
    await page.locator('#login-password').fill('clave-invalida');
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByRole('alert')).toContainText(/credenciales|correo|contraseña/i);
    await expect(page.getByRole('alert')).not.toContainText(/\[object Object\]|\{\}/);
  });
});
