/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const componentsDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(componentsDir, '..');

const compatibilityBarrels: Array<{ file: string; exportStatement: string }> = [
  {
    file: 'AiAdvisor.tsx',
    exportStatement: "export { default } from '../features/ai-advisor/AiAdvisor';",
  },
  {
    file: 'CommandPalette.tsx',
    exportStatement: "export { default } from '../features/command-palette/CommandPalette';",
  },
  {
    file: 'DashboardStats.tsx',
    exportStatement: "export { default } from '../features/dashboard/DashboardStats';",
  },
  {
    file: 'EditCausaModal.tsx',
    exportStatement: "export { default } from '../features/causas/ui/EditCausaModal';",
  },
  {
    file: 'ErrorBoundary.tsx',
    exportStatement: "export { default } from '../shared/ui/ErrorBoundary';",
  },
  { file: 'Header.tsx', exportStatement: "export { default } from '../widgets/header/Header';" },
  { file: 'LoginPage.tsx', exportStatement: "export { default } from '../pages/login/LoginPage';" },
  {
    file: 'MainContent.tsx',
    exportStatement: "export { default } from '../features/causas/MainContent';",
  },
  { file: 'MetricCard.tsx', exportStatement: "export { default } from '../shared/ui/MetricCard';" },
  {
    file: 'NewCausaModal.tsx',
    exportStatement: "export { default } from '../features/causas/ui/NewCausaModal';",
  },
  { file: 'Toast.tsx', exportStatement: "export { ToastProvider } from '../shared/ui/Toast';" },
  {
    file: join('InteractiveTimeline', 'TimelineHeader.tsx'),
    exportStatement: "export { default } from '../../features/timeline/TimelineHeader';",
  },
  {
    file: join('InteractiveTimeline', 'TimelineTabPanels.tsx'),
    exportStatement: "export { default } from '../../features/timeline/TimelineTabPanels';",
  },
  {
    file: join('InteractiveTimeline', 'TimelineTabs.tsx'),
    exportStatement: "export { default } from '../../features/timeline/TimelineTabs';",
  },
  {
    file: join('InteractiveTimeline', 'hooks', 'useBreaches.ts'),
    exportStatement: "export * from '../../../features/timeline/hooks/useBreaches';",
  },
];

describe('components legacy compatibility layer', () => {
  for (const { file, exportStatement } of compatibilityBarrels) {
    it(`${file} conserva un re-export canónico`, async () => {
      const content = await readFile(join(componentsDir, file), 'utf8');

      assert.match(content, /SPDX-License-Identifier: Apache-2\.0/);
      assert.ok(content.includes(exportStatement));
    });
  }

  it('DashboardStats consume MetricCard desde shared/ui', async () => {
    const content = await readFile(
      join(srcDir, 'features', 'dashboard', 'DashboardStats.tsx'),
      'utf8',
    );

    assert.ok(content.includes("import MetricCard from '../../shared/ui/MetricCard';"));
  });

  it('la app consume Toast y ErrorBoundary desde shared/ui', async () => {
    const appContent = await readFile(join(srcDir, 'app', 'App.tsx'), 'utf8');
    const mainContent = await readFile(join(srcDir, 'app', 'main.tsx'), 'utf8');

    assert.ok(appContent.includes("import { ToastProvider } from '../shared/ui/Toast';"));
    assert.ok(mainContent.includes("import ErrorBoundary from '../shared/ui/ErrorBoundary';"));
  });
});
