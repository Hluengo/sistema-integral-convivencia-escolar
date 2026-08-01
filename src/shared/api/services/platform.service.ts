/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

export interface PlatformTenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  user_count: number;
}

export interface PlatformTenantSummary {
  tenants: PlatformTenant[];
}

export interface PlatformTenantSummaryDetails {
  tenant_id: string;
  users: number;
  courses: number;
  students: number;
  cases: number;
  templates: number;
  institution_documents: number;
}

export interface ProvisionTenantInput {
  name: string;
  adminEmail: string;
  slug?: string;
}

export interface ProvisionTenantResult {
  tenant: { id: string; name: string; slug: string };
  invitation: { email: string; status: string };
}

export interface ImportSummary {
  coursesInserted: number;
  studentsInserted: number;
  duplicates: number;
  errors: string[];
}

async function platformRequest<T>(path: string, init?: RequestInit): Promise<T> {
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
        : 'No fue posible completar la operación de plataforma.';
    throw new Error(message);
  }
  return payload as T;
}

export async function fetchPlatformTenants(): Promise<PlatformTenantSummary> {
  return platformRequest<PlatformTenantSummary>('/api/platform/tenants');
}

export async function provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
  return platformRequest<ProvisionTenantResult>('/api/platform/tenants', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchPlatformTenantSummary(
  tenantId: string,
): Promise<PlatformTenantSummaryDetails> {
  return platformRequest<PlatformTenantSummaryDetails>(
    `/api/platform/tenants/${encodeURIComponent(tenantId)}/summary`,
  );
}

export async function resendTenantAdminInvitation(tenantId: string): Promise<void> {
  await platformRequest(`/api/platform/tenants/${encodeURIComponent(tenantId)}/invite`, {
    method: 'POST',
  });
}

export async function importTenantBase(
  tenantId: string,
  file: File,
  defaultLevel: 'BASICA' | 'MEDIA' = 'BASICA',
): Promise<ImportSummary> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('defaultLevel', defaultLevel);
  const response = await fetch(`/api/platform/tenants/${encodeURIComponent(tenantId)}/import`, {
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
  return payload as ImportSummary;
}
