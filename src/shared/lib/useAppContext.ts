/** @license SPDX-License-Identifier: Apache-2.0 */

import { useAuthStore } from './stores/authStore';
import { useCausasStore, selectActiveCausas, selectClosedCausas, selectAulaSeguraCausas } from './stores/causasStore';
import { useUIStore } from './stores/uiStore';
import type { User } from '@supabase/supabase-js';
import type { Causa, UserRole } from '../../types';
import type { SidebarView } from '../../components/Sidebar';

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

export function useAppContext(): AppContextValue {
  const { user, isAuthenticated, setShowLoginModal } = useAuthStore();
  const causasState = useCausasStore();
  const uiState = useUIStore();

  return {
    user,
    isAuthenticated,
    causas: causasState.causas,
    selectedCausaId: causasState.selectedCausaId,
    setSelectedCausaId: causasState.setSelectedCausaId,
    currentRole: uiState.currentRole,
    privacyMode: uiState.privacyMode,
    setPrivacyMode: uiState.setPrivacyMode,
    currentView: uiState.currentView,
    setCurrentView: uiState.setCurrentView,
    handleUpdateCausa: causasState.handleUpdateCausa,
    handleDeleteCausa: (id) => causasState.handleDeleteCausa(id, () => true),
    handleSelectCausaFromDashboard: (causaId) => {
      uiState.setCurrentView('causas');
      causasState.setSelectedCausaId(causaId);
      uiState.setMobileShowDetail(true);
    },
    handleOpenCreateForm: () => uiState.setCurrentView('causas'),
    mobileShowDetail: uiState.mobileShowDetail,
    setMobileShowDetail: uiState.setMobileShowDetail,
    saveStatus: causasState.saveStatus,
    activeCausas: selectActiveCausas(causasState),
    closedCausas: selectClosedCausas(causasState),
    aulaSeguraCausas: selectAulaSeguraCausas(causasState),
    setShowLoginModal,
  };
}
