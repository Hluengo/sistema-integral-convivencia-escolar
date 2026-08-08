/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../../api/lib/supabase';
import {
  fetchPersistedNotifications,
  markAllNotificationsRead,
  setNotificationRead,
  syncNotification,
  type PersistedNotification,
} from '../../api/services/notifications.service';
import { buildNotifications, type Notification } from './useNotifications';
import type { Causa } from '../types';

export interface NotificationCenter {
  notifications: Notification[];
  isLoading: boolean;
  markRead: (notification: Notification) => void;
  markUnread: (notification: Notification) => void;
  markAllRead: () => void;
  refresh: () => void;
}

function toNotificationInput(notification: Notification) {
  return {
    notificationKey: notification.notificationKey ?? notification.id,
    notificationType: notification.notificationType ?? 'due_process',
    title: notification.title,
    description: notification.description,
    severity: notification.urgent ? ('urgent' as const) : ('warning' as const),
    entityType: notification.entityType ?? 'causa',
    entityId: notification.causaId || null,
    actionUrl: notification.actionUrl ?? null,
    expiresAt: notification.expiresAt ?? null,
  };
}

function persistedToNotification(notification: PersistedNotification): Notification {
  return {
    id: notification.id,
    title: notification.title,
    description: notification.description,
    time:
      notification.expires_at && new Date(notification.expires_at) < new Date()
        ? 'Histórica'
        : 'Pendiente',
    urgent: notification.severity === 'urgent',
    causaId: notification.entity_type === 'causa' ? (notification.entity_id ?? '') : '',
    notificationKey: notification.notification_key,
    notificationType: notification.notification_type,
    readAt: notification.read_at,
    expiresAt: notification.expires_at,
    entityType: notification.entity_type,
    actionUrl: notification.action_url,
    persistedId: notification.id,
  };
}

export function useNotifications(causas: Causa[]): NotificationCenter {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const tenantId = useAuthStore((state) => state.tenantId);
  const queryClient = useQueryClient();
  const syncSignatureRef = useRef('');
  const currentNotifications = useMemo(() => {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    return buildNotifications(causas).map((notification) => ({
      ...notification,
      notificationKey: notification.id,
      notificationType: 'due_process',
      readAt: null,
      expiresAt,
      entityType: 'causa',
      actionUrl: `/causas/${encodeURIComponent(notification.causaId)}`,
    }));
  }, [causas]);
  const persistedQuery = useQuery({
    queryKey: ['notifications', tenantId, userId],
    queryFn: fetchPersistedNotifications,
    enabled: Boolean(userId && tenantId),
    staleTime: 30_000,
  });
  const realtimeEnabled = import.meta.env.VITE_NOTIFICATIONS_REALTIME === 'true';

  useEffect(() => {
    if (!realtimeEnabled || !userId || !tenantId) return;
    const queryKey = ['notifications', tenantId, userId];
    const channel = supabase
      .channel(`notifications:${tenantId}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => void queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, realtimeEnabled, tenantId, userId]);

  useEffect(() => {
    if (!userId || !tenantId || persistedQuery.isLoading) return;
    const signature = currentNotifications
      .map(
        (notification) =>
          `${notification.id}:${notification.description}:${notification.expiresAt}`,
      )
      .join('|');
    if (!signature || signature === syncSignatureRef.current) return;
    syncSignatureRef.current = signature;
    void Promise.all(
      currentNotifications.map((notification) =>
        syncNotification(toNotificationInput(notification)),
      ),
    )
      .then(() => queryClient.invalidateQueries({ queryKey: ['notifications', tenantId, userId] }))
      .catch((error: unknown) => {
        console.warn('Error al sincronizar notificaciones persistentes:', error);
      });
  }, [currentNotifications, persistedQuery.isLoading, queryClient, tenantId, userId]);

  const notifications = useMemo(() => {
    const persisted = persistedQuery.data ?? [];
    const persistedByKey = new Map(
      persisted.map((notification) => [notification.notification_key, notification]),
    );
    const mergedCurrent = currentNotifications.map((notification) => {
      const saved = persistedByKey.get(notification.notificationKey ?? notification.id);
      return saved
        ? { ...notification, ...persistedToNotification(saved), urgent: notification.urgent }
        : notification;
    });
    const currentKeys = new Set(
      mergedCurrent.map((notification) => notification.notificationKey ?? notification.id),
    );
    const history = persisted
      .filter((notification) => !currentKeys.has(notification.notification_key))
      .map(persistedToNotification);
    return [...mergedCurrent, ...history].sort(
      (left, right) => Number(right.urgent) - Number(left.urgent),
    );
  }, [currentNotifications, persistedQuery.data]);

  const readMutation = useMutation({
    mutationFn: async ({ notification, read }: { notification: Notification; read: boolean }) => {
      const id =
        notification.persistedId ?? (await syncNotification(toNotificationInput(notification)));
      await setNotificationRead(id, read);
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['notifications', tenantId, userId] }),
  });
  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['notifications', tenantId, userId] }),
  });

  return {
    notifications,
    isLoading: persistedQuery.isLoading,
    markRead: (notification) => readMutation.mutate({ notification, read: true }),
    markUnread: (notification) => readMutation.mutate({ notification, read: false }),
    markAllRead: () => markAllMutation.mutate(),
    refresh: () => void persistedQuery.refetch(),
  };
}
