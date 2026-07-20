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
  selectedStudentForDocs: string | null;

  setCurrentView: (view: SidebarView) => void;
  setIsSidebarCollapsed: (v: boolean) => void;
  setMobileShowDetail: (v: boolean) => void;
  setPrivacyMode: (v: boolean) => void;
  setShowShortcuts: (v: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedStudentForDocs: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'dashboard',
  isSidebarCollapsed: false,
  mobileShowDetail: false,
  privacyMode: false,
  showShortcuts: false,
  currentRole: 'convivencia_escolar',
  selectedStudentForDocs: null,

  setCurrentView: (view) => set({ currentView: view }),
  setIsSidebarCollapsed: (v) => set({ isSidebarCollapsed: v }),
  setMobileShowDetail: (v) => set({ mobileShowDetail: v }),
  setPrivacyMode: (v) => set({ privacyMode: v }),
  setShowShortcuts: (v) => set((state) => ({
    showShortcuts: typeof v === 'function' ? (v as (prev: boolean) => boolean)(state.showShortcuts) : v,
  })),
  setSelectedStudentForDocs: (id) => set({ selectedStudentForDocs: id }),
}));
