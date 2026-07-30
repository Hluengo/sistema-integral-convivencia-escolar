import NotificationsDropdown from './NotificationsDropdown';
import SaveStatus from './SaveStatus';
import PrivacyToggle from './PrivacyToggle';
import UserAvatar from './UserAvatar';

interface HeaderActionsProps {
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  user?: { email?: string } | null;
  notifications: {
    id: string;
    title: string;
    description: string;
    time: string;
    urgent: boolean;
    causaId: string;
  }[];
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
  onNotificationClick,
  onViewAll,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-3 shrink-0 lg:gap-4">
      <NotificationsDropdown
        notifications={notifications}
        onNotificationClick={onNotificationClick}
        onViewAll={onViewAll}
      />

      <PrivacyToggle privacyMode={privacyMode} onToggle={() => setPrivacyMode(!privacyMode)} />

      <SaveStatus status={saveStatus} />

      <UserAvatar user={user} />
    </div>
  );
}
