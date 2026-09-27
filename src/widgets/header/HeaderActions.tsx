/** @license SPDX-License-Identifier: Apache-2.0 */

import NotificationsDropdown from "./NotificationsDropdown";
import SaveStatus from "./SaveStatus";
import PrivacyToggle from "./PrivacyToggle";
import UserAvatar from "./UserAvatar";
import type { Notification } from "../../shared/lib/hooks/useNotifications";

interface HeaderActionsProps {
  privacyMode: boolean;
  onTogglePrivacyMode: () => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  onRetrySave?: () => void;
  user?: { email?: string } | null;
  notifications: Notification[];
  notificationsLoading?: boolean;
  notificationsError?: string | null;
  notificationsUpdating?: boolean;
  onRetryNotifications?: () => Promise<void>;
  onMarkNotificationRead?: (notification: Notification) => Promise<void>;
  onMarkAllNotificationsRead?: () => Promise<void>;
  onNotificationClick?: (causaId: string) => void;
  onViewAll?: () => void;
}

const EMPTY_NOTIFICATIONS: never[] = [];

export default function HeaderActions({
  privacyMode,
  onTogglePrivacyMode,
  saveStatus = "idle",
  onRetrySave,
  user = null,
  notifications = EMPTY_NOTIFICATIONS,
  notificationsLoading = false,
  notificationsError,
  notificationsUpdating = false,
  onRetryNotifications,
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
        notificationsError={notificationsError}
        notificationsUpdating={notificationsUpdating}
        onRetryNotifications={onRetryNotifications}
        onMarkNotificationRead={onMarkNotificationRead}
        onMarkAllNotificationsRead={onMarkAllNotificationsRead}
        onNotificationClick={onNotificationClick}
        onViewAll={onViewAll}
      />

      <PrivacyToggle privacyMode={privacyMode} onToggle={onTogglePrivacyMode} />

      <SaveStatus status={saveStatus} onRetry={onRetrySave} />

      <UserAvatar user={user} />
    </div>
  );
}
