/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

export const ADMIN_ROLES = [
  'admin',
  'direccion',
  'convivencia',
  'inspectoria',
  'profesor_jefe',
  'teacher',
  'inspector',
  'user',
  'staff',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminMemberRole = AdminRole | 'superadmin';

interface TenantProfileSummary {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AdminMemberRole;
  course_ids: string[] | null;
  updated_at: string | null;
}

export interface AdminMember extends TenantProfileSummary {
  tenant_id: string;
  is_active: boolean;
  membershipRole: AdminMemberRole;
  membershipActive: boolean;
  confirmed: boolean;
  lastSignInAt: string | null;
}

interface MembershipInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: AdminRole;
  application_code: string;
  auth_user_id: string | null;
  invited_by: string;
  status: 'pending' | 'accepted' | 'cancelled';
  created_at: string;
  updated_at: string;
  last_sent_at: string;
  cancelled_at: string | null;
  accepted_at: string | null;
}

interface MembershipAuditEvent {
  id: string;
  actor_user_id: string;
  actorEmail: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  occurred_at: string;
}

export interface AdminMembersData {
  members: AdminMember[];
  invitations: MembershipInvitation[];
  history: MembershipAuditEvent[];
}

export interface UsageStatsSummary {
  events: Array<{ event_name: string; total_count: number }>;
  dailyActiveUsers: Array<{ day: string; active_users: number }>;
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : 'No fue posible completar la operación administrativa.';
    throw new Error(message);
  }
  return payload as T;
}

export async function fetchAdminMembers(): Promise<AdminMembersData> {
  return adminRequest<AdminMembersData>('/api/admin/members');
}

export async function updateAdminMember(
  userId: string,
  values: { role: AdminRole; accessEnabled: boolean },
): Promise<void> {
  await adminRequest(`/api/admin/members/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
}

export async function inviteAdminMember(email: string, role: AdminRole): Promise<void> {
  await adminRequest('/api/admin/invitations', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function resendAdminInvitation(invitationId: string): Promise<void> {
  await adminRequest(`/api/admin/invitations/${encodeURIComponent(invitationId)}/resend`, {
    method: 'POST',
  });
}

export async function cancelAdminInvitation(invitationId: string): Promise<void> {
  await adminRequest(`/api/admin/invitations/${encodeURIComponent(invitationId)}/cancel`, {
    method: 'POST',
  });
}

export async function fetchUsageStats(): Promise<UsageStatsSummary> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const response = await fetch('/api/usage/stats', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) throw new Error('No fue posible cargar las métricas de uso.');
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') throw new Error('Respuesta de métricas inválida.');
  const value = payload as Partial<UsageStatsSummary>;
  return {
    events: Array.isArray(value.events) ? (value.events as UsageStatsSummary['events']) : [],
    dailyActiveUsers: Array.isArray(value.dailyActiveUsers)
      ? (value.dailyActiveUsers as UsageStatsSummary['dailyActiveUsers'])
      : [],
  };
}

export interface OwnImportSummary {
  coursesInserted: number;
  studentsInserted: number;
  duplicates: number;
  errors: string[];
}

export async function importOwnTenantBase(
  file: File,
  defaultLevel: 'BASICA' | 'MEDIA' = 'BASICA',
): Promise<OwnImportSummary> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('defaultLevel', defaultLevel);
  const response = await fetch('/api/admin/import', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
        ? payload.error
        : 'No fue posible importar la base del establecimiento.';
    throw new Error(message);
  }
  return payload as OwnImportSummary;
}
