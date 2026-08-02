/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Bell, CheckCheck, History, SlidersHorizontal } from 'lucide-react';
import { useEscapeClose } from './hooks/useEscapeClose';
import type { Notification } from '../../shared/lib/hooks/useNotifications';

type NotificationFilter = 'active' | 'unread' | 'history';

interface NotificationsDropdownProps {
  notifications: Notification[];
  notificationsLoading?: boolean;
  onNotificationClick?: (causaId: string) => void;
  onMarkNotificationRead?: (notification: Notification) => void;
  onMarkAllNotificationsRead?: () => void;
  onViewAll?: () => void;
}

export default function NotificationsDropdown({
  notifications,
  notificationsLoading = false,
  onNotificationClick,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onViewAll,
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('active');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeDropdown = useCallback(() => setIsOpen(false), []);
  useEscapeClose(isOpen, closeDropdown);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
        setIsOpen(false);
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const visibleNotifications = useMemo(() => {
    const now = Date.now();
    return notifications.filter((notification) => {
      const expired = Boolean(
        notification.expiresAt && new Date(notification.expiresAt).getTime() <= now,
      );
      if (filter === 'history') return expired || Boolean(notification.readAt);
      if (filter === 'unread') return !expired && !notification.readAt;
      return !expired;
    });
  }, [filter, notifications]);
  const unreadCount = notifications.filter((notification) => {
    const expired =
      notification.expiresAt && new Date(notification.expiresAt).getTime() <= Date.now();
    return !expired && !notification.readAt;
  }).length;
  const urgentCount = visibleNotifications.filter(
    (notification) => notification.urgent && !notification.readAt,
  ).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="relative cursor-pointer rounded-xl p-2.5 text-neutral-500 transition-colors hover:bg-neutral-100"
        aria-label={`Notificaciones: ${unreadCount} sin leer`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-gravisima-600 px-1 font-bold text-[9px] text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div
            ref={dropdownRef}
            className="absolute top-full right-0 z-50 mt-2 w-[min(400px,calc(100vw-2rem))] animate-scale-in overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
          >
            <div className="border-neutral-100 border-b p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">Notificaciones</h3>
                  <p className="mt-0.5 text-neutral-400 text-xs">
                    {unreadCount} sin leer · {urgentCount} urgentes
                  </p>
                </div>
                <SlidersHorizontal className="size-4 text-neutral-400" aria-hidden="true" />
              </div>
              <div
                className="mt-3 flex gap-1 rounded-xl bg-neutral-100 p-1"
                role="tablist"
                aria-label="Filtrar notificaciones"
              >
                <FilterButton active={filter === 'active'} onClick={() => setFilter('active')}>
                  Activas
                </FilterButton>
                <FilterButton active={filter === 'unread'} onClick={() => setFilter('unread')}>
                  Sin leer
                </FilterButton>
                <FilterButton active={filter === 'history'} onClick={() => setFilter('history')}>
                  <History className="size-3" aria-hidden="true" /> Historial
                </FilterButton>
              </div>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {notificationsLoading ? (
                <div className="px-6 py-10 text-center text-neutral-500 text-sm">
                  Cargando notificaciones…
                </div>
              ) : visibleNotifications.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <Bell className="mb-2 h-6 w-6 text-neutral-300" aria-hidden="true" />
                  <p className="font-medium text-neutral-500 text-sm">Sin notificaciones</p>
                  <p className="text-neutral-400 text-xs">No hay registros para este filtro</p>
                </div>
              ) : (
                visibleNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.persistedId ?? notification.id}
                    notification={notification}
                    onClick={() => {
                      onMarkNotificationRead?.(notification);
                      setIsOpen(false);
                      if (notification.causaId) onNotificationClick?.(notification.causaId);
                    }}
                  />
                ))
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-neutral-100 border-t p-3">
              <button
                type="button"
                onClick={() => onMarkAllNotificationsRead?.()}
                className="inline-flex items-center gap-1.5 font-semibold text-brand-600 text-xs transition-colors hover:text-brand-700"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" /> Marcar todo leído
              </button>
              {onViewAll && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onViewAll();
                  }}
                  className="font-semibold text-brand-600 text-xs transition-colors hover:text-brand-700"
                >
                  Ir a Causas Activas
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-[11px] ${active ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
    >
      {children}
    </button>
  );
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-neutral-100 border-b p-4 text-left transition-colors last:border-b-0 hover:bg-neutral-50 ${notification.readAt ? 'opacity-70' : ''}`}
    >
      <div
        className={`shrink-0 rounded-lg p-1.5 ${notification.urgent ? 'bg-gravisima-50' : 'bg-brand-50'}`}
      >
        <Bell
          className={`h-3.5 w-3.5 ${notification.urgent ? 'text-gravisima-600' : 'text-brand-600'}`}
          aria-hidden="true"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[12px] text-neutral-900">{notification.title}</p>
        <p className="mt-0.5 text-neutral-500 text-xs">{notification.description}</p>
        <span className="mt-1 block text-neutral-400 text-xs">{notification.time}</span>
      </div>
      {!notification.readAt && (
        <span
          className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
          aria-label="Sin leer"
        />
      )}
    </button>
  );
}
