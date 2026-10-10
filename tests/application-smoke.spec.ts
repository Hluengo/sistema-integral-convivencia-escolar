/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from "@playwright/test";
import { dismissWelcome } from "./helpers";

test.describe("Aplicación pública", () => {
  test("muestra el acceso público", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#login-email")).toBeVisible({ timeout: 15_000 });
  });

  test("muestra el formulario de login directamente", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#login-email")).toBeVisible({ timeout: 15_000 });
  });

  test("permite abrir el inicio de sesión y muestra un error profesional", async ({
    page,
  }) => {
    await page.goto("/");
    await dismissWelcome(page);
    await expect(page.locator("#login-email")).toBeVisible({ timeout: 15_000 });
    await page.locator("#login-email").fill("cuenta-inexistente@colegio.cl");
    await page.locator("#login-password").fill("clave-invalida");
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByRole("alert")).toContainText(
      /credenciales|correo|contraseña/i,
    );
    await expect(page.getByRole("alert")).not.toContainText(
      /\[object Object\]|\{\}/,
    );
  });
});
