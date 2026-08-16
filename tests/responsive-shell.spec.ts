/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from '@playwright/test';

test.describe('Shell responsive público', () => {
  for (const viewport of [
    { name: 'escritorio', width: 1440, height: 900 },
    { name: 'móvil', width: 390, height: 844 },
  ]) {
    test(`no genera overflow horizontal en ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.addInitScript(() =>
        window.sessionStorage.setItem('gestion-casos-welcome-seen', 'true'),
      );
      await page.goto('/');
      if (viewport.width < 768) {
        await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible({
          timeout: 15_000,
        });
      } else {
        await expect(
          page.getByRole('complementary', { name: 'Barra de navegación principal' }),
        ).toBeVisible({ timeout: 15_000 });
      }

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `overflow en viewport ${viewport.name}`).toBeLessThanOrEqual(
        dimensions.viewport + 1,
      );
    });
  }
});
