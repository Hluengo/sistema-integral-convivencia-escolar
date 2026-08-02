/** @license SPDX-License-Identifier: Apache-2.0 */

import NotificationsDropdown from './NotificationsDropdown';
import SaveStatus from './SaveStatus';
import PrivacyToggle from './PrivacyToggle';
import UserAvatar from './UserAvatar';
import type { Notification } from '../../shared/lib/hooks/useNotifications';

interface HeaderActionsProps {
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  user?: { email?: string } | null;
  notifications: Notification[];
  notificationsLoading?: boolean;
  onMarkNotificationRead?: (notification: Notification) => void;
  onMarkAllNotificationsRead?: () => void;
  onNotificationClick?: (causaId: string) => void;
  onViewAll?: () => void;
}

const EMPTY_NOTIFICATIONS: never[] = [];

export default function HeaderActions({
  privacyMode,
  setPrivacyMode,
  saveStatus = 'idle',
  user = null,
  notifications = EMPTY_NOTIFICATIONS,
  notificationsLoading = false,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onNotificationClick,
  onViewAll,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-3 shrink-0 lg:gap-4">
      <NotificationsDropdown
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        onMarkNotificationRead={onMarkNotificationRead}
        onMarkAllNotificationsRead={onMarkAllNotificationsRead}
        onNotificationClick={onNotificationClick}
        onViewAll={onViewAll}
      />

      <PrivacyToggle privacyMode={privacyMode} onToggle={() => setPrivacyMode(!privacyMode)} />

      <SaveStatus status={saveStatus} />

      <UserAvatar user={user} />
    </div>
  );
}
