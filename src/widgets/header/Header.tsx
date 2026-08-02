/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import { useNotifications } from '@/src/shared/lib/hooks/usePersistentNotifications';
import type { Causa } from '@/src/shared/lib/types';
import HeaderActions from './HeaderActions';
import PageTitle from './PageTitle';

const MOBILE_BRAND = '/veritas2.webp';

interface HeaderProps {
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  currentView?: string;
  causas: Causa[];
  user?: { email?: string } | null;
  onNotificationClick?: (causaId: string) => void;
  onViewAllNotifications?: () => void;
}

export default memo(function Header({
  privacyMode,
  setPrivacyMode,
  saveStatus = 'idle',
  currentView = 'dashboard',
  causas,
  user = null,
  onNotificationClick,
  onViewAllNotifications,
}: HeaderProps) {
  const notificationCenter = useNotifications(causas);

  return (
    <header className="glass sticky top-0 z-30 shadow-[0_1px_0_rgba(148,163,184,0.12)]">
      <div className="absolute top-0 right-0 left-0 h-[3px] bg-linear-to-r from-brand-700 via-brand-600 to-secondary-500" />

      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile brand + Page title */}
        <div className="flex min-w-0 flex-1 items-center gap-4 pl-10 lg:pl-0">
          {/* Mobile brand */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <img src={MOBILE_BRAND} alt="Escudo Veritas" className="h-9 w-auto" />
          </div>

          {/* Page title - visible on tablet+ */}
          <PageTitle currentView={currentView} />

          <div className="hidden h-8 w-px shrink-0 bg-neutral-200 sm:block" aria-hidden="true" />
        </div>

        {/* Right: Actions */}
        <HeaderActions
          privacyMode={privacyMode}
          setPrivacyMode={setPrivacyMode}
          saveStatus={saveStatus}
          user={user}
          notifications={notificationCenter.notifications}
          notificationsLoading={notificationCenter.isLoading}
          onMarkNotificationRead={notificationCenter.markRead}
          onMarkAllNotificationsRead={notificationCenter.markAllRead}
          onNotificationClick={onNotificationClick}
          onViewAll={onViewAllNotifications}
        />
      </div>
    </header>
  );
});
