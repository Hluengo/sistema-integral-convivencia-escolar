/** @license SPDX-License-Identifier: Apache-2.0 */

import { lazy } from 'react';

export const Header = lazy(() => import('../widgets/header/Header'));
export const Sidebar = lazy(() => import('../widgets/sidebar/Sidebar'));
export const MainContent = lazy(() => import('../components/MainContent'));
export const CommandPalette = lazy(() => import('../components/CommandPalette'));
export const ShortcutsModal = lazy(() => import('../shared/ui/ShortcutsModal'));
export const LoginPage = lazy(() => import('../components/LoginPage'));
