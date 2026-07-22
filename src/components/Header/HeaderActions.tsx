import SearchBar from './SearchBar';
import NotificationsDropdown from './NotificationsDropdown';
import SaveStatus from './SaveStatus';
import PrivacyToggle from './PrivacyToggle';
import UserAvatar from './UserAvatar';

interface HeaderActionsProps {
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  user?: { email?: string } | null;
  notifications: { id: number | string; title: string; description: string; time: string; urgent: boolean; causaId?: string }[];
  onNotificationClick?: (causaId: string) => void;
}

const EMPTY_NOTIFICATIONS: never[] = [];

export default function HeaderActions({
  privacyMode,
  setPrivacyMode,
  saveStatus = 'idle',
  searchQuery = '',
  onSearchChange,
  user = null,
  notifications = EMPTY_NOTIFICATIONS,
  onNotificationClick,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-3 shrink-0 lg:gap-4">
      <div className="relative hidden max-w-md flex-1 md:flex">
        <SearchBar value={searchQuery || ''} onChange={onSearchChange || (() => {})} />
      </div>

      <NotificationsDropdown
        notifications={notifications}
        onNotificationClick={onNotificationClick}
      />

      <PrivacyToggle privacyMode={privacyMode} onToggle={() => setPrivacyMode(!privacyMode)} />

      <SaveStatus status={saveStatus} />

      <UserAvatar user={user} />
    </div>
  );
}