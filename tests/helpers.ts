/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Page } from '@playwright/test';

export async function dismissWelcome(page: Page) {
  const button = page.getByRole('button', { name: 'Continuar sin iniciar sesión', exact: true });
  if (await button.isVisible().catch(() => false)) await button.click();
}
