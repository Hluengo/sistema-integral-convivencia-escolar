/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { dismissWelcome } from './helpers';

const superadminEmail = process.env.E2E_SUPERADMIN_EMAIL;
const superadminPassword = process.env.E2E_SUPERADMIN_PASSWORD;

async function login(page: Page, email: string, password: string) {
  await dismissWelcome(page);
  const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
  await sidebar.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(sidebar.getByText(email)).toBeVisible({ timeout: 15_000 });
}

test.describe('Plataforma superadmin', () => {
  test('la vista de plataforma no está disponible para visitantes anónimos', async ({ page }) => {
    await page.goto('/');
    await dismissWelcome(page);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar).toBeVisible({ timeout: 15_000 });
    await expect(sidebar.getByRole('button', { name: 'Plataforma' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Gestión de colegios' })).toHaveCount(0);
  });

  test.describe('con credenciales de superadmin', () => {
    test.skip(
      !superadminEmail || !superadminPassword,
      'Requiere credenciales E2E de superadmin explícitas.',
    );

    test('el superadmin accede a la gestión de colegios', async ({ page }) => {
      await page.goto('/');
      await login(page, superadminEmail ?? '', superadminPassword ?? '');

      const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
      await sidebar.getByRole('button', { name: 'Plataforma' }).click();

      await expect(page.getByLabel('Colegio para administrar')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Gestión de colegios' })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText('Crear un colegio')).toBeVisible();
    });

    test('el superadmin ve el listado de colegios registrados', async ({ page }) => {
      await page.goto('/');
      await login(page, superadminEmail ?? '', superadminPassword ?? '');

      const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
      await sidebar.getByRole('button', { name: 'Plataforma' }).click();

      await expect(page.getByRole('heading', { name: 'Gestión de colegios' })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText('Colegios registrados')).toBeVisible({ timeout: 15_000 });
    });

    test('el superadmin puede consultar la configuración institucional sin cambiar de sesión', async ({
      page,
    }) => {
      await page.goto('/');
      await login(page, superadminEmail ?? '', superadminPassword ?? '');

      const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
      await sidebar.getByRole('button', { name: 'Plataforma' }).click();
      await page.getByRole('button', { name: 'Configuración institucional' }).click();

      await expect(
        page.getByRole('heading', { name: 'Administración institucional global' }),
      ).toBeVisible({
        timeout: 15_000,
      });
      await page.getByLabel('Colegio para administrar').selectOption({ index: 1 });
      await expect(page.getByLabel('Nombre oficial')).toBeVisible();
    });
  });
});
