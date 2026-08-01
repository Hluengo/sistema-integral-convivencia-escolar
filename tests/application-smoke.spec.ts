/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from '@playwright/test';
import { dismissWelcome } from './helpers';

test.describe('Aplicación pública', () => {
  test('muestra la navegación y el contenido principal', async ({ page }) => {
    await page.goto('/');
    await dismissWelcome(page);

    await expect(
      page.getByRole('complementary', { name: 'Barra de navegación principal' }),
    ).toBeVisible();
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });

  test('muestra una bienvenida anónima con acceso al login', async ({ page }) => {
    await page.addInitScript(() => window.sessionStorage.removeItem('gestion-casos-welcome-seen'));
    await page.goto('/');

    const welcome = page.getByRole('dialog');
    await expect(
      welcome.getByRole('heading', { name: 'Bienvenido a Gestión de Casos' }),
    ).toBeVisible();
    await expect(
      welcome.getByRole('button', { name: 'Iniciar sesión', exact: true }),
    ).toBeVisible();
    await welcome.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.locator('#login-email')).toBeVisible();
  });

  test('permite abrir el inicio de sesión y muestra un error profesional', async ({ page }) => {
    await page.goto('/');
    await dismissWelcome(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });

    await sidebar.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.locator('#login-email').fill('cuenta-inexistente@colegio.cl');
    await page.locator('#login-password').fill('clave-invalida');
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByRole('alert')).toContainText(/credenciales|correo|contraseña/i);
    await expect(page.getByRole('alert')).not.toContainText(/\[object Object\]|\{\}/);
  });
});
