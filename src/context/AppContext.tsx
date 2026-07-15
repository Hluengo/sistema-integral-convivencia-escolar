/** @license SPDX-License-Identifier: Apache-2.0 */

import React from 'react';
import type { User } from '@supabase/supabase-js';
import type { Causa, UserRole } from '../types';
import type { SidebarView } from '../components/Sidebar';
import { AppContext } from './useAppContext';

export interface AppContextValue {
  user: User | null;
  isAuthenticated: boolean;
  causas: Causa[];
  selectedCausaId: string;
  setSelectedCausaId: (id: string) => void;
  currentRole: UserRole;
  privacyMode: boolean;
  setPrivacyMode: (v: boolean) => void;
  currentView: SidebarView;
  setCurrentView: (v: SidebarView) => void;
  handleUpdateCausa: (updated: Causa) => void;
  handleDeleteCausa: (id: string) => void;
  handleSelectCausaFromDashboard: (causaId: string) => void;
  handleOpenCreateForm: () => void;
  mobileShowDetail: boolean;
  setMobileShowDetail: (v: boolean) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  activeCausas: Causa[];
  closedCausas: Causa[];
  aulaSeguraCausas: Causa[];
  setShowLoginModal: (v: boolean) => void;
}

export function AppProvider({ children, value }: { children: React.ReactNode; value: AppContextValue }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
