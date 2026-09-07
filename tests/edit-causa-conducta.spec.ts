import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

// Monta el formulario real con datos ficticios; no necesita sesión ni escribe en Supabase.
test('corrige la conducta, conserva el relato y precarga la selección al reabrir', async ({ page }) => {
  const result = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import EditCausaModalForm from './src/features/causas/EditCausaModal/EditCausaModalForm';
        import { REGLAMENTO_CONDUCTAS } from './src/reglamentoData';
        const original = REGLAMENTO_CONDUCTAS.find(c => c.gravedad === 'Gravísima' && /alcohol/i.test(c.conducta));
        if (!original) throw new Error('Falta la conducta de origen');
        let causa = {
          id: 'TEST-EDICION', estudianteNombre: 'Estudiante de prueba', estudianteCurso: '8 A',
          runEstudiante: '', responsable: 'Inspectoría', estadoActual: 'Recepción de Denuncia',
          tipoInfraccion: original.gravedad, conductaRiceId: original.id,
          comprometeAulaSegura: true, observaciones: 'Relato original que debe conservarse.'
        };
        const root = createRoot(document.getElementById('root'));
        let version = 0;
        function render() {
          root.render(React.createElement(EditCausaModalForm, {
            key: version, causa, onClose() {}, onDelete() {},
            onSave(updated) {
              causa = updated;
              document.getElementById('saved').textContent = JSON.stringify(updated);
              version++;
              render();
            }
          }));
        }
        render();
      `,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    define: { 'process.env.NODE_ENV': '"test"' },
  });
  await page.setContent('<div id="root"></div><pre id="saved"></pre>');
  await page.addScriptTag({ content: result.outputFiles[0].text });
  const selector = page.getByLabel('Descripción de la falta (RICE)');
  await expect(selector.locator('option:checked')).toContainText(/alcohol/i);
  const abandono = selector.locator('option').filter({ hasText: /Abandonar clases/i }).first();
  const id = await abandono.getAttribute('value');
  expect(id).toBeTruthy();
  await selector.selectOption(id!);
  await expect(page.getByLabel('Tipo de infracción', { exact: true })).toHaveValue('Muy Grave');
  await expect(page.getByLabel('Compromete Aula Segura', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Observaciones', { exact: true })).toHaveValue('Relato original que debe conservarse.');
  await page.getByRole('button', { name: 'Guardar Cambios' }).click();
  await expect(page.locator('#saved')).toContainText('"conductaRiceId":"' + id + '"');
  await expect(selector).toHaveValue(id!);
  await expect(page.getByLabel('Observaciones', { exact: true })).toHaveValue('Relato original que debe conservarse.');
});
