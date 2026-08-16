/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { signOut } from '../../shared/api/services/auth.service';
import type { Causa, FaseProcedimental } from '../../shared/lib/types';
import type { SidebarView } from '../../widgets/sidebar/Sidebar';

interface UseAppNavigationArgs {
  user: User | null;
  canAccessAdmin: boolean;
  canAccessReports: boolean;
  canAccessPlatform: boolean;
  clearSessionExpired: () => void;
  setShowLoginModal: (show: boolean) => void;
  setCurrentView: (view: SidebarView) => void;
  setSelectedCausaId: (id: string) => void;
  setMobileShowDetail: (show: boolean) => void;
  setShowShortcuts: (show: boolean) => void;
  setSelectedFaseFilter: (filter: FaseProcedimental | 'Todas') => void;
  handleReopenCausaAction: (causa: Causa) => void;
  navigateToView: (view: SidebarView) => void;
  navigateToCausa: (causaId: string) => void;
  navigateHome: () => void;
}

export function useAppNavigation({
  user,
  canAccessAdmin,
  canAccessReports,
  canAccessPlatform,
  clearSessionExpired,
  setShowLoginModal,
  setCurrentView,
  setSelectedCausaId,
  setMobileShowDetail,
  setShowShortcuts,
  setSelectedFaseFilter,
  handleReopenCausaAction,
  navigateToView,
  navigateToCausa,
  navigateHome,
}: UseAppNavigationArgs) {
  const isTimelineCollapsedRef = useRef(false);

  const requireAuth = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  }, [user, setShowLoginModal]);

  const handleLogout = useCallback(() => {
    clearSessionExpired();
    setCurrentView('dashboard');
    setSelectedCausaId('');
    setMobileShowDetail(false);
    setShowLoginModal(false);
    setShowShortcuts(false);
    navigateHome();
    void signOut();
  }, [
    clearSessionExpired,
    navigateHome,
    setCurrentView,
    setSelectedCausaId,
    setMobileShowDetail,
    setShowLoginModal,
    setShowShortcuts,
  ]);

  const handleViewChange = useCallback(
    (view: SidebarView) => {
      if (view !== 'dashboard' && !user) {
        setShowLoginModal(true);
        return;
      }
      if (view === 'admin' && !canAccessAdmin) return;
      if (view === 'reportes' && !canAccessReports) return;
      if (view === 'platform' && !canAccessPlatform) return;
      navigateToView(view);
      isTimelineCollapsedRef.current = false;
    },
    [canAccessAdmin, canAccessReports, canAccessPlatform, navigateToView, user, setShowLoginModal],
  );

  const handleReopenCausa = useCallback(
    (causa: Causa | null) => {
      if (!causa) return;
      handleReopenCausaAction(causa);
      navigateToCausa(causa.id);
      isTimelineCollapsedRef.current = false;
    },
    [handleReopenCausaAction, navigateToCausa],
  );

  const handleSelectCausaFromDashboard = useCallback(
    (causaId: string) => {
      if (!user) {
        setShowLoginModal(true);
        return;
      }
      setSelectedCausaId(causaId);
      navigateToCausa(causaId);
      setMobileShowDetail(true);
      isTimelineCollapsedRef.current = false;
    },
    [navigateToCausa, user, setShowLoginModal, setSelectedCausaId, setMobileShowDetail],
  );

  const handleViewAllNotifications = useCallback(() => {
    setSelectedFaseFilter('Todas');
    setSelectedCausaId('');
    setMobileShowDetail(false);
    navigateToView('causas');
  }, [navigateToView, setMobileShowDetail, setSelectedCausaId, setSelectedFaseFilter]);

  return {
    requireAuth,
    handleLogout,
    handleViewChange,
    handleReopenCausa,
    handleSelectCausaFromDashboard,
    handleViewAllNotifications,
  };
}
