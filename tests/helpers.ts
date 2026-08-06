/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, type Page } from '@playwright/test';

export const staffEmail = process.env.E2E_STAFF_EMAIL;
export const staffPassword = process.env.E2E_STAFF_PASSWORD;
export const hasStaffCredentials = Boolean(staffEmail && staffPassword);

export async function dismissWelcome(page: Page) {
  const button = page.getByRole('button', { name: 'Continuar sin iniciar sesión', exact: true });
  try {
    if (await button.isVisible().catch(() => false)) {
      // Wait for it to stabilise, then click. If regular click fails due to actionability
      // (animations, overlays), fallback to a JS click which is more resilient.
      await button.waitFor?.({ state: 'visible', timeout: 15_000 }).catch(() => null);
      try {
        await button.click({ timeout: 15_000 });
      } catch {
        // fallback: DOM click
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await button.evaluate((b: any) => b.click());
      }
    }
  } catch {
    // ignore any unexpected errors during welcome dismissal
  }
}

export async function loginAsStaff(page: Page) {
  await page.goto('/');
  await dismissWelcome(page);

  const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
  await sidebar.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.locator('#login-email').fill(staffEmail ?? '');
  await page.locator('#login-password').fill(staffPassword ?? '');
  await page.locator('form button[type="submit"]').click();
  await expect(sidebar.getByText(staffEmail ?? '')).toBeVisible({ timeout: 15_000 });
}
