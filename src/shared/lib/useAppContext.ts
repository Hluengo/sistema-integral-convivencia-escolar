/** @license SPDX-License-Identifier: Apache-2.0 */

import { useMemo } from 'react';
import { useAuthStore } from './stores/authStore';
import {
  useCausasStore,
  selectActiveCausas,
  selectClosedCausas,
  selectAulaSeguraCausas,
} from './stores/causasStore';
import { useUIStore } from './stores/uiStore';
import type { User } from '@supabase/supabase-js';
import type { Causa, UserRole } from './types';
import type { SidebarView } from '../../widgets/sidebar/Sidebar';

export interface AppContextValue {
  user: User | null;
  isAuthenticated: boolean;
  causas: Causa[];
  selectedCausaId: string;
  setSelectedCausaId: (id: string) => void;
  currentRole: UserRole;
  canDeleteCausa: boolean;
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
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setShowLoginModal = useAuthStore((state) => state.setShowLoginModal);
  const profileRole = useAuthStore((state) => state.profileRole);
  const appRole = useAuthStore((state) => state.appRole);

  const causas = useCausasStore((state) => state.causas);
  const selectedCausaId = useCausasStore((state) => state.selectedCausaId);
  const setSelectedCausaId = useCausasStore((state) => state.setSelectedCausaId);
  const saveStatus = useCausasStore((state) => state.saveStatus);
  const handleUpdateCausa = useCausasStore((state) => state.handleUpdateCausa);
  const handleDeleteCausa = useCausasStore((state) => state.handleDeleteCausa);

  const currentRole = useUIStore((state) => state.currentRole);
  const privacyMode = useUIStore((state) => state.privacyMode);
  const setPrivacyMode = useUIStore((state) => state.setPrivacyMode);
  const currentView = useUIStore((state) => state.currentView);
  const setCurrentView = useUIStore((state) => state.setCurrentView);
  const mobileShowDetail = useUIStore((state) => state.mobileShowDetail);
  const setMobileShowDetail = useUIStore((state) => state.setMobileShowDetail);

  const { activeCausas, closedCausas, aulaSeguraCausas } = useMemo(() => {
    const state = { causas };
    return {
      activeCausas: selectActiveCausas(state),
      closedCausas: selectClosedCausas(state),
      aulaSeguraCausas: selectAulaSeguraCausas(state),
    };
  }, [causas]);

  return {
    user,
    isAuthenticated,
    causas,
    selectedCausaId,
    setSelectedCausaId,
    currentRole,
    canDeleteCausa:
      profileRole === 'admin' ||
      profileRole === 'direccion' ||
      appRole === 'admin' ||
      appRole === 'direccion',
    privacyMode,
    setPrivacyMode,
    currentView,
    setCurrentView,
    handleUpdateCausa,
    handleDeleteCausa: (id) => handleDeleteCausa(id, () => true),
    handleSelectCausaFromDashboard: (causaId) => {
      setCurrentView('causas');
      setSelectedCausaId(causaId);
      setMobileShowDetail(true);
    },
    handleOpenCreateForm: () => setCurrentView('causas'),
    mobileShowDetail,
    setMobileShowDetail,
    saveStatus,
    activeCausas,
    closedCausas,
    aulaSeguraCausas,
    setShowLoginModal,
  };
}
