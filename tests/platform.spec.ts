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

    test('el selector mantiene el contexto del colegio en documentos e importación', async ({
      page,
    }) => {
      await page.goto('/');
      await login(page, superadminEmail ?? '', superadminPassword ?? '');

      const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
      await sidebar.getByRole('button', { name: 'Plataforma' }).click();

      const tenantSelector = page.getByLabel('Colegio para administrar');
      await expect(tenantSelector.locator('option')).not.toHaveCount(1, { timeout: 15_000 });
      const selectedTenantName =
        (await tenantSelector.locator('option').nth(1).textContent())?.trim() ?? '';
      expect(selectedTenantName).not.toBe('');
      await tenantSelector.selectOption({ index: 1 });

      await expect(page.getByText(`Administrando ${selectedTenantName}`)).toBeVisible({
        timeout: 15_000,
      });

      await page.getByRole('button', { name: 'Documentos' }).click();
      await expect(page.getByRole('heading', { name: 'Documentos institucionales' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Archivos del colegio' })).toBeVisible();

      await page.getByRole('button', { name: 'Importar base' }).click();
      await expect(
        page.getByRole('heading', { name: 'Importar cursos y estudiantes' }),
      ).toBeVisible();
      await expect(page.getByText(selectedTenantName)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Subir base' })).toBeDisabled();
    });

    test('documentos e importación solicitan seleccionar un colegio', async ({ page }) => {
      await page.goto('/');
      await login(page, superadminEmail ?? '', superadminPassword ?? '');

      const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
      await sidebar.getByRole('button', { name: 'Plataforma' }).click();

      await page.getByRole('button', { name: 'Documentos' }).click();
      await expect(
        page.getByText('Seleccione un colegio para administrar sus documentos institucionales.'),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Importar base' }).click();
      await expect(page.getByText('Seleccione un colegio arriba')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Subir base' })).toBeDisabled();
    });
  });
});
