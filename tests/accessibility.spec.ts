/** @license SPDX-License-Identifier: Apache-2.0 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { dismissWelcome } from './helpers';

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
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
});
