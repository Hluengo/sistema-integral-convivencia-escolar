/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

export interface InstitutionSettings {
  tenant_id: string;
  official_name: string;
  institution_rut: string | null;
  address: string | null;
  commune: string | null;
  region: string | null;
  phone: string | null;
  institutional_email: string | null;
  proprietor: string | null;
  director_name: string | null;
  education_levels: string[];
  logo_path: string | null;
  logo_url: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface InstitutionRuleVersion {
  id: string;
  tenant_id: string;
  title: string;
  version: string;
  content: string;
  status: 'draft' | 'active' | 'archived';
  effective_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  published_by: string | null;
}

export interface OnboardingStatus {
  profile: boolean;
  courses: boolean;
  templates: boolean;
  members: boolean;
  rules: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(data.session?.access_token
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error ?? 'No fue posible completar la solicitud.');
  return payload;
}

export const fetchOnboardingStatus = () => request<OnboardingStatus>('/api/onboarding/status');

export const fetchInstitutionSettings = () =>
  request<InstitutionSettings>('/api/admin/institution');

export const updateInstitutionSettings = (values: Partial<InstitutionSettings>) =>
  request<InstitutionSettings>('/api/admin/institution', {
    method: 'PATCH',
    body: JSON.stringify(values),
  });

export async function uploadInstitutionLogo(file: File): Promise<InstitutionSettings> {
  const { data } = await supabase.auth.getSession();
  const form = new FormData();
  form.append('logo', file);
  const response = await fetch('/api/admin/institution/logo', {
    method: 'POST',
    headers: data.session?.access_token
      ? { Authorization: `Bearer ${data.session.access_token}` }
      : {},
    body: form,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & InstitutionSettings;
  if (!response.ok) throw new Error(payload.error ?? 'No fue posible cargar el logo.');
  return payload;
}

export const fetchInstitutionRules = () =>
  request<{ rules: InstitutionRuleVersion[] }>('/api/admin/rules');

export const createInstitutionRule = (
  values: Pick<InstitutionRuleVersion, 'title' | 'version' | 'content'>,
) =>
  request<InstitutionRuleVersion>('/api/admin/rules', {
    method: 'POST',
    body: JSON.stringify(values),
  });

export const updateInstitutionRule = (
  id: string,
  values: Partial<Pick<InstitutionRuleVersion, 'title' | 'version' | 'content'>>,
) =>
  request<InstitutionRuleVersion>(`/api/admin/rules/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  });

export const publishInstitutionRule = (id: string) =>
  request<InstitutionRuleVersion>(`/api/admin/rules/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
  });

export const fetchPlatformInstitutionSettings = (tenantId: string) =>
  request<InstitutionSettings>(`/api/platform/tenants/${encodeURIComponent(tenantId)}/institution`);

export const updatePlatformInstitutionSettings = (
  tenantId: string,
  values: Partial<InstitutionSettings>,
) =>
  request<InstitutionSettings>(
    `/api/platform/tenants/${encodeURIComponent(tenantId)}/institution`,
    {
      method: 'PATCH',
      body: JSON.stringify(values),
    },
  );

export async function uploadPlatformInstitutionLogo(
  tenantId: string,
  file: File,
): Promise<InstitutionSettings> {
  const { data } = await supabase.auth.getSession();
  const form = new FormData();
  form.append('logo', file);
  const response = await fetch(
    `/api/platform/tenants/${encodeURIComponent(tenantId)}/institution/logo`,
    {
      method: 'POST',
      headers: data.session?.access_token
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {},
      body: form,
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & InstitutionSettings;
  if (!response.ok) throw new Error(payload.error ?? 'No fue posible cargar el logo.');
  return payload;
}

export const fetchPlatformInstitutionRules = (tenantId: string) =>
  request<{ rules: InstitutionRuleVersion[] }>(
    `/api/platform/tenants/${encodeURIComponent(tenantId)}/rules`,
  );

export const createPlatformInstitutionRule = (
  tenantId: string,
  values: Pick<InstitutionRuleVersion, 'title' | 'version' | 'content'>,
) =>
  request<InstitutionRuleVersion>(`/api/platform/tenants/${encodeURIComponent(tenantId)}/rules`, {
    method: 'POST',
    body: JSON.stringify(values),
  });

export const publishPlatformInstitutionRule = (tenantId: string, id: string) =>
  request<InstitutionRuleVersion>(
    `/api/platform/tenants/${encodeURIComponent(tenantId)}/rules/${encodeURIComponent(id)}/publish`,
    { method: 'POST' },
  );
