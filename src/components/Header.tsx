/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search } from 'lucide-react';
import { VIEW_TITLES } from './Header/constants';
import { useNotifications } from '@/src/hooks/useNotifications';
import type { Causa } from '@/src/types';
import HeaderActions from './Header/HeaderActions';
import PageTitle from './Header/PageTitle';
import UserAvatar from './Header/UserAvatar';

const MOBILE_BRAND = '/veritas2.png';

interface HeaderProps {
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  currentView?: string;
  causas: Causa[];
  user?: { email?: string } | null;
  onNotificationClick?: (causaId: string) => void;
}

export default function Header({
  privacyMode,
  setPrivacyMode,
  saveStatus = 'idle',
  searchQuery = '',
  onSearchChange,
  currentView = 'dashboard',
  causas,
  user = null,
  onNotificationClick,
}: HeaderProps) {
  const NOTIFICATIONS = useNotifications(causas);
  const viewMeta = VIEW_TITLES[currentView as keyof typeof VIEW_TITLES] || VIEW_TITLES.dashboard;

  return (
    <header className="glass sticky top-0 z-30">
      <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-brand-700 via-brand-600 to-secondary-500" />

      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile brand + Page title + Search */}
        <div className="flex min-w-0 flex-1 items-center gap-4 pl-10 lg:pl-0">
          {/* Mobile brand */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <img src={MOBILE_BRAND} alt="Escudo Veritas" className="h-9 w-auto" />
          </div>

          {/* Page title - visible on tablet+ */}
          <PageTitle currentView={currentView} />

          <div className="hidden h-8 w-px shrink-0 bg-neutral-200 sm:block" aria-hidden="true" />

          {/* Desktop search */}
          <div className="relative hidden max-w-md flex-1 md:flex">
            <input
              id="global-search"
              type="text"
              spellCheck={false}
              value={searchQuery || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Buscar causas, estudiantes, cursos..."
              className="w-full rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-16 pl-10 font-medium text-neutral-800 text-sm transition-all placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              aria-label="Búsqueda global"
            />
            <button
              type="button"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="absolute top-1/2 right-2 flex -translate-y-1/2 cursor-pointer items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-2 text-[11px] text-neutral-400 transition-colors hover:bg-neutral-100"
              aria-label="Atajo de búsqueda: Ctrl+K"
            >
              <kbd className="h-5 px-1.5 rounded border border-neutral-200 bg-white text-neutral-600 font-mono text-[10px]">⌘K</kbd>
            </button>
          </div>

          {/* Mobile search toggle */}
          <button
            type="button"
            className="ml-auto cursor-pointer rounded-xl p-2 text-neutral-500 transition-all hover:bg-neutral-100 md:hidden"
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Right: Actions */}
        <HeaderActions
          privacyMode={privacyMode}
          setPrivacyMode={setPrivacyMode}
          saveStatus={saveStatus}
          searchQuery={searchQuery || ''}
          onSearchChange={onSearchChange}
          user={user}
          notifications={NOTIFICATIONS}
          onNotificationClick={onNotificationClick}
        />
      </div>
    </header>
  );
}