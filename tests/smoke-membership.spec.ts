/** @license SPDX-License-Identifier: Apache-2.0 */

import { test, expect, type Page } from '@playwright/test';
import { dismissWelcome } from './helpers';

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? 'usuario@colegio.cl';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? '123456';
const NO_MEMBERSHIP_EMAIL = process.env.E2E_NO_MEMBERSHIP_EMAIL ?? 'e2e-sin-membresia@colegio.cl';
const NO_MEMBERSHIP_PASSWORD = process.env.E2E_NO_MEMBERSHIP_PASSWORD ?? 'e2e-nomembership-2026';

// Mismo cálculo que getMembershipMode() en server/middleware/requireMembership.ts
// y que getMembershipAuthMode() en src/shared/api/lib/membershipConfig.ts.
const MEMBERSHIP_ENABLED = process.env.VITE_APP_MEMBERSHIPS_ENABLED === 'true';
const MEMBERSHIP_ENFORCED = process.env.VITE_APP_MEMBERSHIPS_ENFORCED === 'true';
const MODE: 'legacy' | 'transition' | 'enforced' = !MEMBERSHIP_ENABLED
  ? 'legacy'
  : MEMBERSHIP_ENFORCED
    ? 'enforced'
    : 'transition';

async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await dismissWelcome(page);

  const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
  await expect(sidebar).toBeVisible({ timeout: 15000 });

  const loginBtn = sidebar.getByRole('button', { name: 'Iniciar sesión' });
  await expect(loginBtn).toBeVisible({ timeout: 5000 });
  await loginBtn.click();

  await expect(page.locator('#login-email')).toBeVisible({ timeout: 5000 });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.locator('form button[type="submit"]').click();
}

test.describe('Convivencia - Phase 3 Membership Enforcement', () => {
  test.describe.configure({ mode: 'serial' });

  test('legacy mode: login/logout with flag=false (no membership check)', async ({ page }) => {
    test.skip(
      MODE !== 'legacy',
      'Solo aplica cuando la verificación de membresía está desactivada',
    );

    const errors: string[] = [];
    const rpcRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('request', (req) => {
      const url = req.url();
      if (
        req.resourceType() === 'fetch' &&
        (url.includes('current_user_memberships') || url.includes('has_app_access'))
      ) {
        rpcRequests.push(url);
      }
    });

    await login(page, STAFF_EMAIL, STAFF_PASSWORD);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar.getByText(STAFF_EMAIL)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('footer')).toContainText('Debido Proceso');

    const membershipErrors = errors.filter((e) => /membership/i.test(e));
    expect(membershipErrors).toEqual([]);

    // En modo legacy el servidor NO consulta la RPC de membresía.
    expect(rpcRequests).toEqual([]);

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.waitForTimeout(3000);

    await expect(sidebar.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('transition mode: membership RPC runs and staff with active membership enters', async ({
    page,
  }) => {
    test.skip(MODE !== 'transition', 'Solo aplica en modo de transición');

    const membershipRequests: string[] = [];

    page.on('request', (req) => {
      if (req.url().includes('current_user_memberships')) {
        membershipRequests.push(req.url());
      }
    });

    await login(page, STAFF_EMAIL, STAFF_PASSWORD);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar.getByText(STAFF_EMAIL)).toBeVisible({ timeout: 15000 });

    // El staff E2E tiene membresía activa → entra sin recurrir al fallback.
    await expect(page.locator('footer')).toContainText('Debido Proceso');
    await expect(page.getByText('No tiene acceso a esta aplicación')).not.toBeVisible();

    // En modo transition la RPC SÍ se consulta desde el navegador.
    expect(membershipRequests.length).toBeGreaterThan(0);

    await sidebar.getByRole('button', { name: 'Causas' }).click();
    await expect(page.getByText('Vista: Expedientes')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.waitForTimeout(3000);

    await expect(sidebar.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Vista: Panel de control')).toBeVisible({ timeout: 10000 });
  });

  test('enforced mode: staff with active membership enters', async ({ page }) => {
    test.skip(MODE !== 'enforced', 'Solo aplica en modo de verificación estricta');

    await login(page, STAFF_EMAIL, STAFF_PASSWORD);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar.getByText(STAFF_EMAIL)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('footer')).toContainText('Debido Proceso');

    // El staff E2E tiene membresía activa, por lo que NO debe ver AccessDenied.
    await expect(page.getByText('No tiene acceso a esta aplicación')).not.toBeVisible();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.waitForTimeout(3000);

    await expect(sidebar.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('enforced mode: AccessDenied screen when account has no membership', async ({ page }) => {
    test.skip(MODE !== 'enforced', 'Solo aplica en modo de verificación estricta');

    await login(page, NO_MEMBERSHIP_EMAIL, NO_MEMBERSHIP_PASSWORD);

    // Sin membresía activa en modo enforced → pantalla de acceso denegado.
    await expect(page.getByText('No tiene acceso a esta aplicación')).toBeVisible({
      timeout: 15000,
    });

    // La aplicación principal no debe estar disponible (no hay footer de la app).
    await expect(page.locator('footer')).toHaveCount(0);
  });

  test('logout clears session and returns to login', async ({ page }) => {
    await login(page, STAFF_EMAIL, STAFF_PASSWORD);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar.getByText(STAFF_EMAIL)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.waitForTimeout(3000);

    await expect(sidebar.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible({
      timeout: 10000,
    });

    const loginModal = page.locator('#login-email');
    await expect(loginModal).not.toBeVisible();
  });
});
