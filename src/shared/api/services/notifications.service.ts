/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

export interface PersistedNotification {
  id: string;
  tenant_id: string;
  user_id: string;
  notification_key: string;
  notification_type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'urgent';
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  read_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationSyncInput {
  notificationKey: string;
  notificationType: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'urgent';
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  expiresAt: string | null;
}

const NOTIFICATION_SELECT =
  'id,tenant_id,user_id,notification_key,notification_type,title,description,severity,entity_type,entity_id,action_url,read_at,expires_at,created_at,updated_at';

export async function fetchPersistedNotifications(): Promise<PersistedNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as PersistedNotification[];
}

export async function syncNotification(input: NotificationSyncInput): Promise<string> {
  const { data, error } = await supabase.rpc('sync_notification', {
    p_notification_key: input.notificationKey,
    p_notification_type: input.notificationType,
    p_title: input.title,
    p_description: input.description,
    p_severity: input.severity,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_action_url: input.actionUrl,
    p_expires_at: input.expiresAt,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Respuesta inválida al persistir la notificación.');
  return data;
}

export async function setNotificationRead(id: string, read: boolean): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({
      read_at: read ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}
