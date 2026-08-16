/** @license SPDX-License-Identifier: Apache-2.0 */

import { create } from 'zustand';
import type { SidebarView } from '../../../widgets/sidebar/Sidebar';
import type { UserRole } from '../types';

interface UIState {
  currentView: SidebarView;
  isSidebarCollapsed: boolean;
  mobileShowDetail: boolean;
  privacyMode: boolean;
  showShortcuts: boolean;
  currentRole: UserRole;

  setCurrentView: (view: SidebarView) => void;
  setIsSidebarCollapsed: (v: boolean) => void;
  setMobileShowDetail: (v: boolean) => void;
  setPrivacyMode: (v: boolean) => void;
  togglePrivacyMode: () => void;
  setShowShortcuts: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: initialViewFromPathname(),
  isSidebarCollapsed: false,
  mobileShowDetail: false,
  privacyMode: false,
  showShortcuts: false,
  currentRole: 'convivencia_escolar',

  setCurrentView: (view) => set({ currentView: view }),
  setIsSidebarCollapsed: (v) => set({ isSidebarCollapsed: v }),
  setMobileShowDetail: (v) => set({ mobileShowDetail: v }),
  setPrivacyMode: (v) => set({ privacyMode: v }),
  togglePrivacyMode: () => set((state) => ({ privacyMode: !state.privacyMode })),
  setShowShortcuts: (v) =>
    set((state) => ({
      showShortcuts:
        typeof v === 'function' ? (v as (prev: boolean) => boolean)(state.showShortcuts) : v,
    })),
}));

/**
 * Vista inicial derivada del pathname: evita que al deep-linkear
 * `/expedientes/:id` se pinte un frame del dashboard con su loader antes de
 * que el enrutador aplique la intención de la URL.
 */
function initialViewFromPathname(): SidebarView {
  if (typeof window === 'undefined') return 'dashboard';
  const { pathname } = window.location;
  if (pathname.startsWith('/expedientes')) return 'causas';
  if (pathname.startsWith('/anotaciones')) return 'anotaciones';
  if (pathname.startsWith('/alumnos')) return 'alumnos';
  if (pathname.startsWith('/informes')) return 'informes';
  if (pathname.startsWith('/reportes')) return 'reportes';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/plataforma')) return 'platform';
  return 'dashboard';
}
