/** @license SPDX-License-Identifier: Apache-2.0 */
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { dismissWelcome } from "./helpers";

const BREAKPOINTS = [
  { name: "desktop-xl", width: 1440, height: 900 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      offenders: Array.from(document.querySelectorAll("*"))
        .filter((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          return r.width > window.innerWidth + 1 && r.width < 10000;
        })
        .slice(0, 5)
        .map(
          (el) =>
            `${el.tagName}.${((el as HTMLElement).className as string).toString().slice(0, 60)}`,
        ),
    };
  });
  expect(
    overflow.scrollWidth <= overflow.clientWidth + 1,
    `${label}: overflow horizontal (scroll ${overflow.scrollWidth} > viewport ${overflow.clientWidth}): ${overflow.offenders.join(" | ")}`,
  ).toBe(true);
}

test.describe("Responsive sin scroll horizontal", () => {
  for (const bp of BREAKPOINTS) {
    test(`dashboard público en ${bp.name} (${bp.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("/");
      await dismissWelcome(page);
      await expect(page.locator('main, [role="main"]')).toBeVisible({
        timeout: 15_000,
      });
      await page.waitForTimeout(500);
      await expectNoHorizontalOverflow(page, `dashboard público ${bp.name}`);
    });

    test(`login en ${bp.name} (${bp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.addInitScript(() =>
        window.sessionStorage.setItem("gestion-casos-welcome-seen", "true"),
      );
      await page.goto("/login");
      await expect(page.locator("#login-email")).toBeVisible({
        timeout: 15_000,
      });
      await page.waitForTimeout(500);
      await expectNoHorizontalOverflow(page, `login ${bp.name}`);
    });
  }
});

test.describe("Responsive vistas privadas", () => {
  const views = [
    { sidebar: "Dashboard", label: "dashboard privado" },
    { sidebar: "Causas", label: "causas" },
    { sidebar: "Anotaciones", label: "anotaciones" },
    { sidebar: "Estudiantes", label: "estudiantes" },
  ];

  async function openMobileMenuIfNeeded(page: Page) {
    // Si el drawer ya está abierto (p. ej. tras el login), no hacer nada.
    if (
      await page
        .getByRole("dialog", { name: "Menú móvil" })
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }
    const openMenu = page.getByRole("button", { name: "Abrir menú" });
    if (await openMenu.isVisible().catch(() => false)) {
      await openMenu.click();
      await page.waitForTimeout(600);
    }
  }

  async function loginResponsive(page: Page) {
    await page.goto("/");
    await dismissWelcome(page);
    await openMobileMenuIfNeeded(page);
    const mobileMenu = page.getByRole("dialog", { name: "Menú móvil" });
    const loginButton = (await mobileMenu.isVisible().catch(() => false))
      ? mobileMenu.getByRole("button", { name: "Iniciar sesión" })
      : page
          .getByRole("complementary", { name: "Barra de navegación principal" })
          .getByRole("button", { name: "Iniciar sesión" });
    await loginButton.click();
    await page.locator("#login-email").fill(process.env.E2E_STAFF_EMAIL ?? "");
    await page
      .locator("#login-password")
      .fill(process.env.E2E_STAFF_PASSWORD ?? "");
    await page.locator('form button[type="submit"]').click();
    // El formulario se desmonta solo cuando la auth termina y cierra el modal.
    await expect(page.locator("#login-email")).toBeHidden({ timeout: 60_000 });
  }

  for (const bp of BREAKPOINTS) {
    for (const view of views) {
      test(`${view.label} en ${bp.name} (${bp.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: bp.width, height: bp.height });
        await loginResponsive(page);
        await openMobileMenuIfNeeded(page);
        const mobileMenu = page.getByRole("dialog", { name: "Menú móvil" });
        const navScope = (await mobileMenu.isVisible().catch(() => false))
          ? mobileMenu
          : page.getByRole("complementary", {
              name: "Barra de navegación principal",
            });
        const button = navScope.getByRole("button", {
          name: view.sidebar,
          exact: true,
        });
        await expect(button).toBeVisible({ timeout: 15_000 });
        await button.click();
        await page.waitForTimeout(800);
        await expectNoHorizontalOverflow(page, `${view.label} ${bp.name}`);
      });
    }
  }
});
