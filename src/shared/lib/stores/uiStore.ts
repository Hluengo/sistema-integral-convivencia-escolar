/** @license SPDX-License-Identifier: Apache-2.0 */

import { create } from 'zustand';
import type { SidebarView } from '../../../components/Sidebar';
import type { UserRole } from '../../../types';

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
  setShowShortcuts: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'dashboard',
  isSidebarCollapsed: false,
  mobileShowDetail: false,
  privacyMode: false,
  showShortcuts: false,
  currentRole: 'convivencia_escolar',

  setCurrentView: (view) => set({ currentView: view }),
  setIsSidebarCollapsed: (v) => set({ isSidebarCollapsed: v }),
  setMobileShowDetail: (v) => set({ mobileShowDetail: v }),
  setPrivacyMode: (v) => set({ privacyMode: v }),
  setShowShortcuts: (v) => set((state) => ({
    showShortcuts: typeof v === 'function' ? (v as (prev: boolean) => boolean)(state.showShortcuts) : v,
  })),
}));
