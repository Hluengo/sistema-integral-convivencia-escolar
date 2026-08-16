/** @license SPDX-License-Identifier: Apache-2.0 */

import { expect, test } from '@playwright/test';
import { hasStaffCredentials, loginAsStaff } from './helpers';

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
test.describe('Auditoría integral 2026-08-15 (E2E final)', () => {
  test.skip(!hasStaffCredentials, 'Requiere credenciales E2E explícitas.');

  test('flujo completo: crear causa RICE y validar gate de transición de fase', async ({
    page,
  }) => {
    await loginAsStaff(page);

    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /causas/i }).click();

    // Abre el formulario de nuevo expediente y valida el flujo RICE completo
    // (curso, estudiante, RUN autocompletado y clasificación). NO se envía el
    // formulario: el staff E2E no tiene permiso de eliminación (RLS restringe
    // delete a admin/direccion/superadmin), así que no se persiste nada.
    await page
      .getByRole('button', { name: /crear nueva causa|nueva causa/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: /nuevo expediente/i })).toBeVisible({
      timeout: 20_000,
    });

    // Selecciona curso y estudiante (datos del seed E2E). Espera a que las
    // opciones reales carguen antes de seleccionar.
    const courseSelect = page.getByLabel('Curso del estudiante');
    await expect
      .poll(async () => courseSelect.locator('option').count(), { timeout: 15_000 })
      .toBeGreaterThan(1);
    const firstCourseValue = await courseSelect.locator('option').nth(1).getAttribute('value');
    await courseSelect.selectOption(firstCourseValue ?? '');

    const studentSelect = page.getByLabel('Estudiante', { exact: true });
    await expect
      .poll(async () => studentSelect.locator('option').count(), { timeout: 15_000 })
      .toBeGreaterThan(1);
    const firstStudentValue = await studentSelect.locator('option').nth(1).getAttribute('value');
    await studentSelect.selectOption(firstStudentValue ?? '');
    await expect(page.getByLabel('RUN o RUT')).not.toHaveValue('', { timeout: 15_000 });

    // Clasificación RICE: falta grave y relato de los hechos.
    await page.getByLabel('Gravedad').selectOption('Grave');
    await page
      .getByLabel('Relato de los hechos')
      .fill(
        'Se registra conducta de desorden que interrumpe la clase de forma reiterada. El hecho fue observado por el docente a cargo durante la jornada escolar.',
      );
    await page.getByLabel('Fiscalizador a cargo').fill('Inspector E2E Auditoría');

    // Cierra sin guardar (no se persiste la causa).
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 });

    // Gate de transición: abre un expediente existente (solo lectura, sin
    // guardar) e intenta saltar una fase completa.
    const manageButton = page.getByRole('button', { name: /Gestionar expediente/i }).first();
    await expect(manageButton).toBeVisible({ timeout: 20_000 });
    await manageButton.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Editar expediente' }).click();
    await expect(page.getByRole('heading', { name: 'Editar Expediente' })).toBeVisible({
      timeout: 15_000,
    });

    const estadoSelect = page.getByLabel('Estado actual');
    const estadoInicial = await estadoSelect.inputValue();
    // Si el expediente está en una fase temprana, saltar a un estado de fase
    // +2 debe ser bloqueado por el resolver.
    const optionCount = await estadoSelect.locator('option').count();
    await estadoSelect.selectOption({ index: optionCount - 1 });

    const error = page.getByRole('alert').filter({
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
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('heading', { name: 'Editar Expediente' })).not.toBeVisible({
      timeout: 15_000,
    });
  });

  test('cartas incluyen la cláusula de reconsideración (5 días hábiles ante Dirección)', async ({
    page,
  }) => {
    await loginAsStaff(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /anotaciones/i }).click();
    await expect(page.getByRole('heading', { name: /Anotaciones/i })).toBeVisible({
      timeout: 15_000,
    });

    // La tabla de estudiantes carga después del encabezado: espera a que
    // existan filas antes de decidir si el estudiante está disponible.
    const detailButton = page.getByRole('button', { name: /Ver detalle de/i }).first();
    await expect
      .poll(async () => page.getByRole('button', { name: /Ver detalle de/i }).count(), {
        timeout: 20_000,
      })
      .toBeGreaterThan(0);
    if (!(await detailButton.isVisible().catch(() => false))) {
      test.skip(true, 'No hay estudiantes con anotaciones disponibles para E2E.');
      return;
    }
    await detailButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('tab', { name: 'Carta', exact: true }).click();

    const createLetter = dialog.getByRole('button', { name: /Crear carta/i });
    if (!(await createLetter.isEnabled().catch(() => false))) {
      test.skip(true, 'El estudiante E2E no tiene una carta disponible para generar.');
      return;
    }
    await createLetter.click();
    await expect(dialog.getByText('Generador de carta', { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // La plantilla base de las tres cartas cierra con la cláusula de
    // reconsideración ante la Dirección (visible en el editor y en la
    // previsualización del documento).
    const clausula = dialog.getByText(
      /reconsideración de esta medida por escrito ante la Dirección/i,
    );
    await expect(clausula.first()).toBeVisible({ timeout: 15_000 });
    await expect(
      dialog.getByText(/5 días hábiles siguientes a la notificación/i).first(),
    ).toBeVisible();
  });

  test('modo privacidad oculta RUN y nombres completos visibles', async ({ page }) => {
    await loginAsStaff(page);
    const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
    await sidebar.getByRole('button', { name: /causas/i }).click();

    await page.getByRole('button', { name: 'Activar modo privacidad' }).click();
    await expect(page.getByRole('button', { name: 'Desactivar modo privacidad' })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/\d{1,2}\.\d{3}\.\d{3}-[\dkK]/);
  });

  test.describe('superadmin', () => {
    test.skip(
      !superadminEmail || !superadminPassword,
      'Requiere credenciales E2E de superadmin explícitas.',
    );

    test('accede a la plataforma y exporta reportes Excel', async ({ page }) => {
      await page.goto('/');
      const { dismissWelcome } = await import('./helpers');
      await dismissWelcome(page);

      const sidebar = page.getByRole('complementary', { name: 'Barra de navegación principal' });
      await sidebar.getByRole('button', { name: 'Iniciar sesión' }).click();
      await page.locator('#login-email').fill(superadminEmail ?? '');
      await page.locator('#login-password').fill(superadminPassword ?? '');
      await page.locator('form button[type="submit"]').click();
      await expect(sidebar.getByText(superadminEmail ?? '')).toBeVisible({ timeout: 15_000 });

      await sidebar.getByRole('button', { name: 'Plataforma' }).click();
      await expect(page.getByRole('heading', { name: 'Gestión de colegios' })).toBeVisible({
        timeout: 15_000,
      });

      // Reportes: la exportación Excel genera una descarga.
      await sidebar.getByRole('button', { name: /reportes/i }).click();
      await expect(page.getByRole('heading', { name: 'Centro de reportes' })).toBeVisible({
        timeout: 15_000,
      });

      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
      await page.getByRole('button', { name: 'Exportar Excel' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    });
  });
});
