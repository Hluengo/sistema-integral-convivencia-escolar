/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { SidebarView } from '../../widgets/sidebar/Sidebar';
import {
  canAccessView,
  causaToPath,
  isPublicView,
  routeIntentFromPath,
  viewToPath,
} from '../routing';

interface UseUrlRoutingArgs {
  user: User | null;
  currentView: SidebarView;
  selectedCausaId: string;
  canAccessAdmin: boolean;
  canAccessReports: boolean;
  canAccessPlatform: boolean;
  setCurrentView: (view: SidebarView) => void;
  setSelectedCausaId: (id: string) => void;
  setShowLoginModal: (show: boolean) => void;
}

export function useUrlRouting({
  user,
  currentView,
  selectedCausaId,
  canAccessAdmin,
  canAccessReports,
  canAccessPlatform,
  setCurrentView,
  setSelectedCausaId,
  setShowLoginModal,
}: UseUrlRoutingArgs) {
  const [pathname, setPathname] = useState(() => getCurrentPathname());
  const gates = useMemo(
    () => ({ canAccessAdmin, canAccessReports, canAccessPlatform }),
    [canAccessAdmin, canAccessPlatform, canAccessReports],
  );

  useEffect(() => {
    const handlePopState = () => setPathname(getCurrentPathname());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;
    const nextPath = path || '/';
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentPath === nextPath) return;
    if (options?.replace) {
      window.history.replaceState(null, '', nextPath);
    } else {
      window.history.pushState(null, '', nextPath);
    }
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    const intent = routeIntentFromPath(pathname);

    if (intent.kind === 'not-found') {
      navigate('/', { replace: true });
      return;
    }

    if (intent.kind === 'login') {
      if (user) {
        navigate('/', { replace: true });
        return;
      }
      if (currentView !== 'dashboard') setCurrentView('dashboard');
      if (selectedCausaId) setSelectedCausaId('');
      setShowLoginModal(true);
      return;
    }

    if (!user && !isPublicView(intent.view)) {
      setShowLoginModal(true);
      navigate('/login', { replace: true });
      return;
    }

    if (!canAccessView(intent.view, gates)) {
      navigate('/', { replace: true });
      return;
    }

    if (currentView !== intent.view) setCurrentView(intent.view);
    if (intent.view === 'causas') {
      const nextCausaId = intent.causaId ?? '';
      if (selectedCausaId !== nextCausaId) setSelectedCausaId(nextCausaId);
    }
  }, [
    currentView,
    gates,
    navigate,
    pathname,
    selectedCausaId,
    setCurrentView,
    setSelectedCausaId,
    setShowLoginModal,
    user,
  ]);

  const navigateToView = useCallback(
    (view: SidebarView) => {
      if (!user && !isPublicView(view)) {
        setShowLoginModal(true);
        navigate('/login');
        return;
      }
      if (!canAccessView(view, gates)) return;
      navigate(viewToPath(view));
    },
    [gates, navigate, setShowLoginModal, user],
  );

  const navigateToCausa = useCallback(
    (causaId: string) => {
      if (!user) {
        setShowLoginModal(true);
        navigate('/login');
        return;
      }
      navigate(causaToPath(causaId));
    },
    [navigate, setShowLoginModal, user],
  );

  const navigateHome = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false);
    if (routeIntentFromPath(pathname).kind === 'login') {
      navigate('/', { replace: true });
    }
  }, [navigate, pathname, setShowLoginModal]);

  return { navigateToView, navigateToCausa, navigateHome, closeLoginModal };
}

function getCurrentPathname(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}
