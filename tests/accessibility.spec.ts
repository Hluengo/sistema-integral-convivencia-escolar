/** @license SPDX-License-Identifier: Apache-2.0 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { dismissWelcome, hasStaffCredentials, loginAsStaff } from './helpers';

const superadminEmail = process.env.E2E_SUPERADMIN_EMAIL;
const superadminPassword = process.env.E2E_SUPERADMIN_PASSWORD;

async function expectNoA11yViolations(page: Page, include?: string) {
  // Evita medir controles durante animaciones de entrada, cuando la opacidad
  // intermedia puede producir falsos positivos de contraste en Axe.
  await page.waitForTimeout(400);
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  const results = await (include ? builder.include(include) : builder).analyze();

  expect(results.violations).toEqual([]);
}

async function loginAsSuperadmin(page: Page) {
  await page.goto('/');
  await dismissWelcome(page);
  const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
  await sidebar.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.locator('#login-email').fill(superadminEmail ?? '');
  await page.locator('#login-password').fill(superadminPassword ?? '');
  await page.locator('form button[type="submit"]').click();
  await expect(sidebar.getByText(superadminEmail ?? '')).toBeVisible({ timeout: 15_000 });
}

test.describe('Accesibilidad pública', () => {
  test('dashboard público cumple WCAG A/AA básico', async ({ page }) => {
    await page.goto('/');
    await dismissWelcome(page);
    await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 15_000 });

    await expectNoA11yViolations(page);
  });

  test('modal de login cumple WCAG A/AA básico', async ({ page }) => {
    await page.addInitScript(() =>
      window.sessionStorage.setItem('gestion-casos-welcome-seen', 'true'),
    );
    await page.goto('/login');
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 15_000 });

    await expectNoA11yViolations(page);
  });

  test.skip(!hasStaffCredentials, 'Requiere credenciales E2E explícitas.');
  test('modal de expediente autenticado cumple WCAG A/AA básico', async ({ page }) => {
    await loginAsStaff(page);
    await page.getByRole('button', { name: /causas/i }).click();
    const manageButton = page.getByRole('button', { name: /Gestionar expediente/i }).first();
    await expect(manageButton).toBeVisible({ timeout: 20_000 });
    await manageButton.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20_000 });

    await expectNoA11yViolations(page);
  });

  test('modal de creación de expediente cumple WCAG A/AA básico', async ({ page }) => {
    await loginAsStaff(page);
    await page.getByRole('button', { name: /causas/i }).click();
    await page
      .getByRole('button', { name: /crear nueva causa|nueva causa/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: /nuevo expediente/i })).toBeVisible({
      timeout: 20_000,
    });

    await expectNoA11yViolations(page);
  });

  test('vistas privadas principales cumplen WCAG A/AA básico', async ({ page }) => {
    await loginAsStaff(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    const views = [
      { label: 'Anotaciones', heading: /Anotaciones/i },
      { label: 'Asistente Legal', heading: /Asistente legal/i },
    ];

    for (const view of views) {
      const button = sidebar.getByRole('button', { name: view.label, exact: true });
      await expect(button).toBeVisible({ timeout: 15_000 });
      await button.click();
      await expect(page.getByRole('heading', { name: view.heading }).first()).toBeVisible({
        timeout: 15_000,
      });
      await expectNoA11yViolations(page);
    }
  });

  test('modal de nuevo proceso en Anotaciones cumple WCAG A/AA básico', async ({ page }) => {
    await loginAsStaff(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: 'Anotaciones', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Anotaciones/i })).toBeVisible({
      timeout: 15_000,
    });

    const createButton = page.getByRole('button', { name: /Crear nuevo proceso/i });
    await expect(createButton).toBeVisible({ timeout: 15_000 });
    await createButton.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15_000 });
    await expectNoA11yViolations(page, '[role="dialog"]');
  });

  test('formularios de archivo y edición en Anotaciones cumplen WCAG A/AA básico', async ({
    page,
  }) => {
    await loginAsStaff(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: 'Anotaciones', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Anotaciones/i })).toBeVisible({
      timeout: 15_000,
    });

    const detailButton = page.getByRole('button', { name: /Ver detalle de/i }).first();
    if (!(await detailButton.isVisible().catch(() => false))) {
      test.skip(true, 'No hay estudiantes con anotaciones disponibles para E2E.');
      return;
    }

    await detailButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('tab', { name: 'Revisar PDF', exact: true }).click();
    await expect(dialog.getByLabel('Seleccionar PDF de hoja de vida')).toBeAttached();
    await expectNoA11yViolations(page, '[role="dialog"]');

    const editButton = dialog.getByRole('tab', { name: 'Editar anotaciones', exact: true });
    await editButton.click();
    await expectNoA11yViolations(page, '[role="dialog"]');
  });

  test('generador de cartas cumple WCAG A/AA básico', async ({ page }) => {
    await loginAsStaff(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: 'Anotaciones', exact: true }).click();
    const detailButton = page.getByRole('button', { name: /Ver detalle de/i }).first();
    if (!(await detailButton.isVisible().catch(() => false))) {
      test.skip(true, 'No hay estudiantes con anotaciones disponibles para E2E.');
      return;
    }

    await detailButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('tab', { name: 'Cartas', exact: true }).click();
    const createLetter = dialog.getByRole('button', { name: /Crear carta/i });
    if (!(await createLetter.isEnabled().catch(() => false))) {
      test.skip(true, 'El estudiante E2E no tiene una carta disponible para generar.');
      return;
    }
    await createLetter.click();
    await expect(dialog.getByText('Generador de carta', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoA11yViolations(page, '[role="dialog"]');
  });

  test('modal de edición de expediente cumple WCAG A/AA básico', async ({ page }) => {
    await loginAsStaff(page);
    await page.getByRole('button', { name: /Causas/i }).click();
    const manageButton = page.getByRole('button', { name: /Gestionar expediente/i }).first();
    await expect(manageButton).toBeVisible({ timeout: 20_000 });
    await manageButton.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20_000 });

    const editButton = page.getByRole('button', { name: 'Editar expediente' });
    await expect(editButton).toBeVisible({ timeout: 15_000 });
    await editButton.click();
    await expect(page.getByRole('heading', { name: 'Editar Expediente' })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoA11yViolations(page, '[role="dialog"]');
  });

  test('Administración cumple WCAG A/AA básico cuando el rol tiene acceso', async ({ page }) => {
    await loginAsStaff(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    const adminButton = sidebar.getByRole('button', { name: 'Administración', exact: true });
    if (!(await adminButton.isVisible().catch(() => false))) {
      test.skip(true, 'El usuario E2E no tiene permisos de administración.');
      return;
    }
    await adminButton.click();
    await expect(page.getByRole('heading', { name: 'Centro del establecimiento' })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoA11yViolations(page);
  });

  test('Plataforma cumple WCAG A/AA básico para superadmin', async ({ page }) => {
    test.skip(
      !superadminEmail || !superadminPassword,
      'Requiere credenciales E2E de superadmin explícitas.',
    );
    await loginAsSuperadmin(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: 'Plataforma', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Gestión de colegios' })).toBeVisible({
      timeout: 15_000,
    });
    await expectNoA11yViolations(page);
  });
});
