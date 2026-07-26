/** @license SPDX-License-Identifier: Apache-2.0 */

import { test, expect } from '@playwright/test';

const STAFF_EMAIL = process.env.E2E_STAFF_EMAIL ?? 'usuario@colegio.cl';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? '123456';

test.describe('Convivencia - Phase 2 Membership Smoke', () => {
  test('login/logout with flag=false (or flag=true without enforcement)', async ({ page }) => {
    const errors: string[] = [];
    const rpcRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('request', (req) => {
      if (req.url().includes('membership') || req.url().includes('current_user_memberships')) {
        rpcRequests.push(req.url());
      }
    });

    await page.goto('/');

    // Wait for the desktop sidebar to render (auth loading finished)
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // Scope login button to the desktop sidebar (avoids the hidden mobile duplicate)
    const loginBtn = sidebar.getByRole('button', { name: 'Iniciar sesión' });
    await expect(loginBtn).toBeVisible({ timeout: 5000 });
    await loginBtn.click();

    // Login modal should appear
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 5000 });

    // Fill credentials
    await page.fill('#login-email', STAFF_EMAIL);
    await page.fill('#login-password', STAFF_PASSWORD);
    await page.locator('form button[type="submit"]').click();

    // Wait for auth to resolve and sidebar to update with user email (scope to sidebar)
    await expect(sidebar.getByText(STAFF_EMAIL)).toBeVisible({ timeout: 15000 });

    // Main footer rendered
    await expect(page.locator('footer')).toContainText('Debido Proceso');

    // No membership errors
    const membershipErrors = errors.filter((e) => /membership/i.test(e));
    expect(membershipErrors).toEqual([]);

    // No membership RPC calls when flag=false
    expect(rpcRequests).toEqual([]);

    // Logout
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.waitForTimeout(3000);

    // Login button visible again after logout
    await expect(sidebar.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible({
      timeout: 10000,
    });
  });
});
