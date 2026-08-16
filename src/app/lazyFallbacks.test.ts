/** @license SPDX-License-Identifier: Apache-2.0 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const srcDir = join(process.cwd(), 'src');

async function readTsxFiles(dir: string): Promise<Array<{ path: string; content: string }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return readTsxFiles(path);
      if (!entry.isFile() || !entry.name.endsWith('.tsx')) return [];
      return [{ path, content: await readFile(path, 'utf8') }];
    }),
  );
  return files.flat();
}

describe('lazy loading fallbacks', () => {
  it('evita fallbacks vacíos en boundaries lazy de app y features', async () => {
    const files = await readTsxFiles(srcDir);
    const offenders = files
      .filter(
        (file) =>
          file.path.includes(`${join('src', 'app')}`) ||
          file.path.includes(`${join('src', 'features')}`),
      )
      .filter((file) => file.content.includes('fallback={null}'))
      .map((file) => file.path.replace(process.cwd(), '.'));

    assert.deepEqual(offenders, []);
  });

  it('mantiene loaders específicos para vistas y modales lazy críticos', async () => {
    const app = await readFile(join(srcDir, 'app', 'App.tsx'), 'utf8');
    const mainContent = await readFile(
      join(srcDir, 'features', 'causas', 'MainContent.tsx'),
      'utf8',
    );
    const causasView = await readFile(
      join(srcDir, 'features', 'causas', 'MainContent', 'CausasView.tsx'),
      'utf8',
    );
    const anotacionesView = await readFile(
      join(srcDir, 'features', 'anotaciones', 'AnotacionesView.tsx'),
      'utf8',
    );
    const cartasTab = await readFile(
      join(srcDir, 'features', 'anotaciones', 'AnotacionesStudentDetailModal', 'CartasTab.tsx'),
      'utf8',
    );

    assert.ok(app.includes('fallback={<SidebarSkeleton />}'));
    assert.ok(app.includes('fallback={<HeaderSkeleton />}'));
    assert.ok(app.includes('fallback={<ModalSkeleton />}'));
    // Las vistas lazy de MainContent usan ViewLoader con frases contextuales en vez de skeletons.
    assert.ok(!mainContent.includes('ReportsViewSkeleton'));
    assert.ok(!mainContent.includes('ManagementViewSkeleton'));
    assert.ok(!mainContent.includes('PlatformViewSkeleton'));
    const viewLoaderFallbacks =
      mainContent.split('fallback={<ViewLoader view={currentView} />}').length - 1;
    assert.ok(
      viewLoaderFallbacks >= 7,
      `Se esperaban al menos 7 fallbacks ViewLoader en MainContent, hay ${viewLoaderFallbacks}`,
    );
    assert.ok(
      mainContent.includes("const CausasView = lazy(() => import('./MainContent/CausasView'))"),
    );
    assert.ok(!causasView.includes('CausaCardSkeleton'));
    assert.ok(causasView.includes('fallback={<ViewLoader view="causas" compact />}'));
    assert.ok(causasView.includes('fallback={<DetailModalSkeleton />}'));
    assert.ok(anotacionesView.includes('fallback={<ModalSkeleton />}'));
    assert.ok(cartasTab.includes('fallback={<DocumentGeneratorSkeleton />}'));
  });
});
