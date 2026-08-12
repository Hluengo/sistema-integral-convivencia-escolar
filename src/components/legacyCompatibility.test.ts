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
    file: 'ClosedCases.tsx',
    exportStatement: "export { default } from '../features/causas/ClosedCases';",
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
  {
    file: 'InteractiveTimeline.tsx',
    exportStatement: "export { default } from '../features/timeline/InteractiveTimeline';",
  },
  {
    file: join('Header', 'HeaderActions.tsx'),
    exportStatement: "export { default } from '../../widgets/header/HeaderActions';",
  },
  {
    file: join('Header', 'NotificationsDropdown.tsx'),
    exportStatement: "export { default } from '../../widgets/header/NotificationsDropdown';",
  },
  {
    file: join('Header', 'PageTitle.tsx'),
    exportStatement: "export { default } from '../../widgets/header/PageTitle';",
  },
  {
    file: join('Header', 'PrivacyToggle.tsx'),
    exportStatement: "export { default } from '../../widgets/header/PrivacyToggle';",
  },
  {
    file: join('Header', 'SaveStatus.tsx'),
    exportStatement: "export { default } from '../../widgets/header/SaveStatus';",
  },
  {
    file: join('Header', 'UserAvatar.tsx'),
    exportStatement: "export { default } from '../../widgets/header/UserAvatar';",
  },
  {
    file: join('Header', 'constants.ts'),
    exportStatement: "export { VIEW_TITLES } from '../../widgets/header/constants';",
  },
  {
    file: join('Header', 'hooks', 'useEscapeClose.ts'),
    exportStatement:
      "export { useEscapeClose } from '../../../widgets/header/hooks/useEscapeClose';",
  },
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
  {
    file: 'Sidebar.tsx',
    exportStatement: "export { default } from '../widgets/sidebar/Sidebar';",
  },
  {
    file: 'SidebarUserMenu.tsx',
    exportStatement:
      "export { SidebarAulaSeguraAlert, SidebarUserMenu } from '../widgets/sidebar/SidebarUserMenu';",
  },
  {
    file: 'ShortcutsModal.tsx',
    exportStatement: "export { default } from '../shared/ui/ShortcutsModal';",
  },
  {
    file: 'TemplateEditor.tsx',
    exportStatement: "export { default } from '../features/document-templates/TemplateEditor';",
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

  it('la app consume Sidebar desde widgets/sidebar', async () => {
    const lazyComponents = await readFile(join(srcDir, 'app', 'lazyAppComponents.ts'), 'utf8');

    assert.ok(
      lazyComponents.includes(
        "export const Sidebar = lazy(() => import('../widgets/sidebar/Sidebar'));",
      ),
    );
  });

  it('la app consume Header desde widgets/header', async () => {
    const lazyComponents = await readFile(join(srcDir, 'app', 'lazyAppComponents.ts'), 'utf8');

    assert.ok(
      lazyComponents.includes(
        "export const Header = lazy(() => import('../widgets/header/Header'));",
      ),
    );
  });

  it('MainContent consume los títulos de vista desde widgets/header', async () => {
    const mainContent = await readFile(
      join(srcDir, 'features', 'causas', 'MainContent.tsx'),
      'utf8',
    );

    assert.ok(
      mainContent.includes("import { VIEW_TITLES } from '../../widgets/header/constants';"),
    );
  });

  it('CausasView consume ClosedCases desde features/causas', async () => {
    const causasView = await readFile(
      join(srcDir, 'features', 'causas', 'MainContent', 'CausasView.tsx'),
      'utf8',
    );

    assert.ok(causasView.includes("const ClosedCases = lazy(() => import('../ClosedCases'));"));
  });

  it('las vistas consumen TemplateEditor desde features/document-templates', async () => {
    const adminView = await readFile(join(srcDir, 'features', 'admin', 'AdminView.tsx'), 'utf8');
    const advisorView = await readFile(
      join(srcDir, 'features', 'causas', 'MainContent', 'AdvisorView.tsx'),
      'utf8',
    );

    assert.ok(
      adminView.includes("import TemplateEditor from '../document-templates/TemplateEditor';"),
    );
    assert.ok(
      advisorView.includes(
        "const TemplateEditor = lazy(() => import('../../document-templates/TemplateEditor'));",
      ),
    );
  });

  it('CausaDetailModal consume InteractiveTimeline desde features/timeline', async () => {
    const modal = await readFile(
      join(srcDir, 'features', 'causas', 'CausaDetailModal.tsx'),
      'utf8',
    );

    assert.ok(modal.includes("import InteractiveTimeline from '../timeline/InteractiveTimeline';"));
  });

  it('la app consume ShortcutsModal desde shared/ui', async () => {
    const lazyComponents = await readFile(join(srcDir, 'app', 'lazyAppComponents.ts'), 'utf8');

    assert.ok(
      lazyComponents.includes(
        "export const ShortcutsModal = lazy(() => import('../shared/ui/ShortcutsModal'));",
      ),
    );
  });
});
