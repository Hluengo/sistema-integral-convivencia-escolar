import { test, expect } from "@playwright/test";
import { build } from "esbuild";

declare global {
  interface Window {
    render: (estadoActual: string, canReopen: boolean) => void;
  }
}

// Monta el formulario real con datos ficticios; no necesita sesión ni escribe en Supabase.
test("el modal Editar reserva la reapertura a quien tiene potestad", async ({
  page,
}) => {
  const result = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import EditCausaModalForm from './src/features/causas/EditCausaModal/EditCausaModalForm';
        const base = {
          id: 'TEST-GATE', estudianteNombre: 'Estudiante de prueba', estudianteCurso: '8 A',
          runEstudiante: '', responsable: 'Inspectoría',
          tipoInfraccion: 'Grave', conductaRiceId: '', comprometeAulaSegura: false,
          observaciones: 'Relato original que debe conservarse.',
        };
        const root = createRoot(document.getElementById('root'));
        window.render = (estadoActual, canReopen) => root.render(
          React.createElement(EditCausaModalForm, {
            causa: { ...base, estadoActual },
            canReopen,
            onClose() {},
            onDelete() {},
            onSave(updated) {
              document.getElementById('saved').textContent = updated.estadoActual;
            },
          }),
        );
      `,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    define: { "process.env.NODE_ENV": '"test"' },
  });
  await page.setContent('<div id="root"></div><pre id="saved"></pre>');
  await page.addScriptTag({ content: result.outputFiles[0].text });

  const estado = page.locator("#edit-estado");
  const guardar = page.getByRole("button", { name: "Guardar Cambios" });

  // Expediente cerrado y sin potestad: el estado queda fijo en "Causa Cerrada".
  await page.evaluate(() => window.render("Causa Cerrada", false));
  await expect(estado).toHaveValue("Causa Cerrada");
  await expect(estado.locator("option")).toHaveCount(1);

  // Con potestad se ofrecen todos los estados.
  await page.evaluate(() => window.render("Causa Cerrada", true));
  expect(await estado.locator("option").count()).toBeGreaterThan(1);

  // Otro usuario cierra el expediente mientras el formulario tenía elegido
  // "En Proceso de Indagación": el guard debe bloquear la reapertura.
  await page.evaluate(() => window.render("Recepción de Denuncia", false));
  await estado.selectOption("En Proceso de Indagación");
  await page.evaluate(() => window.render("Causa Cerrada", false));
  await guardar.click();
  await expect(page.getByRole("alert")).toContainText(/no puede reabrir/i);
  await expect(page.locator("#saved")).toHaveText("");

  // Con potestad el mismo cambio sí se guarda.
  await page.evaluate(() => window.render("Recepción de Denuncia", true));
  await estado.selectOption("En Proceso de Indagación");
  await guardar.click();
  await expect(page.locator("#saved")).toHaveText("En Proceso de Indagación");
  await expect(page.getByRole("alert")).toHaveCount(0);
});
