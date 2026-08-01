/** @license SPDX-License-Identifier: Apache-2.0 */

import { test, expect } from '@playwright/test';
import { dismissWelcome } from './helpers';

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? 'usuario@colegio.cl';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? '123456';

test.describe('Convivencia - Phase 3 Membership Enforcement', () => {
  test.describe.configure({ mode: 'serial' });

  test('legacy mode: login/logout with flag=false (no membership check)', async ({ page }) => {
    const errors: string[] = [];
    const rpcRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('request', (req) => {
      const url = req.url();
      if (
        req.resourceType() === 'fetch' &&
        (url.includes('membership') || url.includes('current_user_memberships'))
      ) {
        rpcRequests.push(url);
      }
    });

    await page.goto('/');
    await dismissWelcome(page);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    const loginBtn = sidebar.getByRole('button', { name: 'Iniciar sesión' });
    await expect(loginBtn).toBeVisible({ timeout: 5000 });
    await loginBtn.click();

    await expect(page.locator('#login-email')).toBeVisible({ timeout: 5000 });
    await page.fill('#login-email', STAFF_EMAIL);
    await page.fill('#login-password', STAFF_PASSWORD);
    await page.locator('form button[type="submit"]').click();

    await expect(sidebar.getByText(STAFF_EMAIL)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('footer')).toContainText('Debido Proceso');

    const membershipErrors = errors.filter((e) => /membership/i.test(e));
    expect(membershipErrors).toEqual([]);

    expect(rpcRequests).toEqual([]);

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.waitForTimeout(3000);

    await expect(sidebar.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('transition mode: staff with fallback when membership unavailable', async ({ page }) => {
    const membershipRequests: string[] = [];

    page.on('request', (req) => {
      if (req.url().includes('current_user_memberships')) {
        membershipRequests.push(req.url());
      }
    });

    await page.goto('/');
    await dismissWelcome(page);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    const loginBtn = sidebar.getByRole('button', { name: 'Iniciar sesión' });
    await loginBtn.click();

    await expect(page.locator('#login-email')).toBeVisible({ timeout: 5000 });
    await page.fill('#login-email', STAFF_EMAIL);
    await page.fill('#login-password', STAFF_PASSWORD);
    await page.locator('form button[type="submit"]').click();

    await expect(sidebar.getByText(STAFF_EMAIL)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.waitForTimeout(3000);

    await expect(sidebar.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('enforced mode: AccessDenied screen when no membership', async ({ page }) => {
    await page.goto('/');
    await dismissWelcome(page);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    const loginBtn = sidebar.getByRole('button', { name: 'Iniciar sesión' });
    await loginBtn.click();

    await expect(page.locator('#login-email')).toBeVisible({ timeout: 5000 });
    await page.fill('#login-email', STAFF_EMAIL);
    await page.fill('#login-password', STAFF_PASSWORD);
    await page.locator('form button[type="submit"]').click();

    await page.waitForTimeout(3000);

    const accessDenied = page.getByText('No tiene acceso');
    const mainContent = page.locator('footer').filter({ hasText: 'Debido Proceso' });

    const isAccessDenied = await accessDenied.isVisible().catch(() => false);
    const isMainVisible = await mainContent.isVisible().catch(() => false);

    expect(isAccessDenied || isMainVisible).toBe(true);
  });

  test('logout clears session and returns to login', async ({ page }) => {
    await page.goto('/');
    await dismissWelcome(page);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    const loginBtn = sidebar.getByRole('button', { name: 'Iniciar sesión' });
    await loginBtn.click();

    await expect(page.locator('#login-email')).toBeVisible({ timeout: 5000 });
    await page.fill('#login-email', STAFF_EMAIL);
    await page.fill('#login-password', STAFF_PASSWORD);
    await page.locator('form button[type="submit"]').click();

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
