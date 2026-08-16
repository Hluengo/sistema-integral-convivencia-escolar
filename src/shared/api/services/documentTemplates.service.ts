/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

export interface DocumentTemplate {
  id: string;
  doc_type: string;
  label: string;
  system_prompt: string;
  updated_at?: string;
}

interface ApiErrorPayload {
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDocumentTemplate(value: unknown): value is DocumentTemplate {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.doc_type === 'string' &&
    typeof value.label === 'string' &&
    typeof value.system_prompt === 'string' &&
    (value.updated_at === undefined || typeof value.updated_at === 'string')
  );
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}));
}

export async function fetchAdminDocumentTemplates(): Promise<DocumentTemplate[]> {
  const response = await fetch('/api/document-templates/admin', {
    headers: await getAuthHeaders(),
  });

  if (response.status === 401) {
    throw new Error('Sesión no válida. Inicie sesión nuevamente.');
  }
  if (response.status === 403) {
    throw new Error('Esta sección está disponible solo para Dirección y Administración.');
  }
  if (!response.ok) {
    throw new Error('No fue posible cargar las plantillas institucionales.');
  }

  const payload = await readJson(response);
  if (!Array.isArray(payload) || !payload.every(isDocumentTemplate)) {
    throw new Error('La respuesta de plantillas no tiene un formato válido.');
  }

  return payload;
}

export async function updateDocumentTemplate(input: {
  id: string;
  systemPrompt: string;
}): Promise<void> {
  const response = await fetch('/api/document-templates', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({ id: input.id, system_prompt: input.systemPrompt }),
  });
  const payload = (await readJson(response)) as ApiErrorPayload & { success?: boolean };

  if (!response.ok || payload.success !== true) {
    throw new Error(payload.error ?? 'Error al guardar.');
  }
}
