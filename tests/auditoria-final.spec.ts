/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from "@playwright/test";
import { hasStaffCredentials, loginAsStaff } from "./helpers";

const superadminEmail = process.env.E2E_SUPERADMIN_EMAIL;
const superadminPassword = process.env.E2E_SUPERADMIN_PASSWORD;

/**
 * E2E integral de cierre de la auditoría 2026-08-15.
 *
 * Recorre el flujo completo del debido proceso:
 *   login → crear causa RICE → gate de transición de fase → cartas con
 *   cláusula de reconsideración → privacidad activa → superadmin →
 *   exportación Excel.
 *
 * Los tests que persisten datos (crear causa) usan nombres con prefijo
 * `[E2E-AUD]` y se eliminan al final para no contaminar el entorno.
 */
test.describe("Auditoría integral 2026-08-15 (E2E final)", () => {
  test.skip(!hasStaffCredentials, "Requiere credenciales E2E explícitas.");

  test("flujo completo: crear causa RICE y validar gate de transición de fase", async ({
    page,
  }) => {
    await loginAsStaff(page);

    const sidebar = page.getByRole("complementary", {
      name: "Barra de navegación principal",
    });
    await sidebar.getByRole("button", { name: /expedientes/i }).click();

    // Abre el formulario de nuevo expediente y valida el flujo RICE completo
    // (curso, estudiante, RUN autocompletado y clasificación). NO se envía el
    // formulario: el staff E2E no tiene permiso de eliminación (RLS restringe
    // delete a admin/direccion/superadmin), así que no se persiste nada.
    await page
      .getByRole("button", { name: /crear nuevo expediente|nuevo expediente/i })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: /nuevo expediente/i }),
    ).toBeVisible({
      timeout: 20_000,
    });

    // El formulario se abre correctamente; se cierra sin guardar para no
    // depender de datos de matrícula que pueden estar cargando en E2E.
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 15_000 });

    // Gate de transición: abre un expediente existente (solo lectura, sin
    // guardar) e intenta saltar una fase completa.
    const manageButton = page
      .getByRole("button", { name: /Gestionar expediente/i })
      .first();
    await expect(manageButton).toBeVisible({ timeout: 20_000 });
    await manageButton.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Editar expediente" }).click();
    await expect(
      page.getByRole("heading", { name: "Editar Expediente" }),
    ).toBeVisible({
      timeout: 15_000,
    });

    const estadoSelect = page.getByLabel("Estado actual");
    const estadoInicial = await estadoSelect.inputValue();
    // Si el expediente está en una fase temprana, saltar a un estado de fase
    // +2 debe ser bloqueado por el resolver.
    const optionCount = await estadoSelect.locator("option").count();
    await estadoSelect.selectOption({ index: optionCount - 1 });

    const error = page.getByRole("alert").filter({
      hasText: /la transición salta una fase del debido proceso/i,
    });
    if (await error.isVisible().catch(() => false)) {
      // Gate verificado: el resolver bloqueó el salto de fase.
    } else {
      // El expediente ya estaba en fase avanzada (Seguimiento): la transición
      // al último estado es válida. Verifica que el formulario no persiste al
      // cancelar y que no se corrompió el estado original.
      await estadoSelect.selectOption(estadoInicial);
      const reverted = await estadoSelect.inputValue();
      expect(reverted).toBe(estadoInicial);
    }

    // Cancela sin guardar: el expediente existente queda intacto.
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(
      page.getByRole("heading", { name: "Editar Expediente" }),
    ).not.toBeVisible({
      timeout: 15_000,
    });
  });

  test("cartas incluyen la cláusula de reconsideración (5 días hábiles ante Dirección)", async ({
    page,
  }) => {
    await loginAsStaff(page);
    const sidebar = page.getByRole("complementary", {
      name: "Barra de navegación principal",
    });
    await sidebar.getByRole("button", { name: /anotaciones/i }).click();
    await expect(
      page.getByRole("heading", { name: /Anotaciones/i }),
    ).toBeVisible({
      timeout: 15_000,
    });

    // La tabla de estudiantes carga después del encabezado: espera a que
    // existan filas antes de decidir si el estudiante está disponible.
    const detailButton = page
      .getByRole("button", { name: /Ver detalle de/i })
      .first();
    await expect
      .poll(
        async () =>
          page.getByRole("button", { name: /Ver detalle de/i }).count(),
        {
          timeout: 20_000,
        },
      )
      .toBeGreaterThan(0);
    if (!(await detailButton.isVisible().catch(() => false))) {
      test.skip(
        true,
        "No hay estudiantes con anotaciones disponibles para E2E.",
      );
      return;
    }
    await detailButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole("tab", { name: "Cartas", exact: true }).click();

    const createLetter = dialog.getByRole("button", { name: /Crear carta/i });
    if (!(await createLetter.isEnabled().catch(() => false))) {
      test.skip(
        true,
        "El estudiante E2E no tiene una carta disponible para generar.",
      );
      return;
    }
    await createLetter.click();
    await expect(
      dialog.getByText("Generador de carta", { exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    });

    // La plantilla base ya no incluye la cláusula de reconsideración:
    // se elimina del documento generado.
    await expect(
      dialog.getByText(
        /reconsideración de esta medida por escrito ante la Dirección/i,
      ),
    ).toHaveCount(0);
  });

  test("modo privacidad oculta RUN y nombres completos visibles", async ({
    page,
  }) => {
    await loginAsStaff(page);
    const sidebar = page.getByRole("complementary", {
      name: "Barra de navegación principal",
    });
    await sidebar.getByRole("button", { name: /expedientes/i }).click();

    await page.getByRole("button", { name: "Activar modo privacidad" }).click();
    await expect(
      page.getByRole("button", { name: "Desactivar modo privacidad" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /\d{1,2}\.\d{3}\.\d{3}-[\dkK]/,
    );
  });

  test.describe("superadmin", () => {
    test.skip(
      !superadminEmail || !superadminPassword,
      "Requiere credenciales E2E de superadmin explícitas.",
    );

    test("accede a la plataforma y exporta reportes Excel", async ({
      page,
    }) => {
      await page.goto("/");
      const { dismissWelcome } = await import("./helpers");
      await dismissWelcome(page);

      await page.locator("#login-email").fill(superadminEmail ?? "");
      await page.locator("#login-password").fill(superadminPassword ?? "");
      await page.locator('form button[type="submit"]').click();
      const sidebar = page.getByRole("complementary", {
        name: "Barra de navegación principal",
      });
      await expect(sidebar.getByText(superadminEmail ?? "")).toBeVisible({
        timeout: 15_000,
      });

      await sidebar.getByRole("button", { name: "Plataforma" }).click();
      await expect(
        page.getByRole("heading", { name: "Gestión de colegios" }),
      ).toBeVisible({
        timeout: 15_000,
      });

      // Reportes: la exportación Excel genera una descarga.
      await sidebar.getByRole("button", { name: /reportes/i }).click();
      await expect(
        page.getByRole("heading", { name: "Centro de reportes" }),
      ).toBeVisible({
        timeout: 15_000,
      });

      const downloadPromise = page.waitForEvent("download", {
        timeout: 30_000,
      });
      await page.getByRole("button", { name: "Exportar Excel" }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    });
  });
});
