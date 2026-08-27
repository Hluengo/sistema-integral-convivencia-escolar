/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';
import type { DocumentScope } from '../../lib/types';

const STORAGE_BUCKET = 'documentos_convivencia';
const SIGNED_URL_TTL_SECONDS = 3600;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_UPLOAD_ACCEPT =
  '.pdf,.md,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp';
export const DOCUMENT_UPLOAD_HELPER_TEXT =
  'PDF, Markdown, Word o imagen (JPG, PNG o WEBP). Máximo 10 MB.';
export const DOCUMENT_UPLOAD_PLACEHOLDER = 'Seleccionar PDF, Markdown, Word o imagen';

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  'pdf',
  'md',
  'doc',
  'docx',
  'jpg',
  'jpeg',
  'png',
  'webp',
]);

export function resolveDocumentOwnerId(
  causaId: string,
  incidenteId: string | undefined,
  scope: DocumentScope = 'causa',
): string {
  return scope === 'incidente' && incidenteId ? incidenteId : causaId;
}

function isMissingStorageObject(error: { message?: string } | null): boolean {
  return error?.message === 'Object not found';
}

export function normalizeDocumentPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed.replace(/^\/+/, '');

  try {
    const url = new URL(trimmed);
    const markers = [
      `/storage/v1/object/sign/${STORAGE_BUCKET}/`,
      `/storage/v1/object/public/${STORAGE_BUCKET}/`,
      `/storage/v1/object/authenticated/${STORAGE_BUCKET}/`,
    ];
    const marker = markers.find((candidate) => url.pathname.includes(candidate));
    if (!marker) return null;
    const encodedPath = url.pathname.split(marker)[1];
    return encodedPath ? decodeURIComponent(encodedPath) : null;
  } catch {
    return null;
  }
}

/** Upload and return an immediately usable signed URL. Persistence services store only its stable path. */
export async function uploadDocument(
  ownerId: string,
  file: File,
  prefix: string = 'documentos',
): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    throw new Error('Formato no permitido. Use PDF, Markdown, Word o imagen JPG, PNG o WEBP.');
  }
  if (file.size === 0) {
    throw new Error('El documento está vacío.');
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('El documento supera el tamaño máximo de 10 MB.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const filePath = `${ownerId}/${prefix}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) {
    console.error('Error uploading document:', error);
    throw new Error('No fue posible subir el documento al almacenamiento privado.');
  }
  return filePath;
}

async function getDocumentSignedUrl(pathOrLegacyUrl: string): Promise<string | null> {
  const filePath = normalizeDocumentPath(pathOrLegacyUrl);
  if (!filePath) return null;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    // Historical rows can survive a migration without their backing Storage
    // bytes. Treat those as unavailable; keep reporting unexpected failures.
    if (!isMissingStorageObject(error)) {
      console.error('Error creating signed document URL:', error);
    }
    return null;
  }
  return data.signedUrl;
}

export async function openDocument(pathOrLegacyUrl: string): Promise<boolean> {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  const signedUrl = await getDocumentSignedUrl(pathOrLegacyUrl);
  if (!signedUrl) {
    popup?.close();
    return false;
  }
  if (popup) popup.location.href = signedUrl;
  else window.location.assign(signedUrl);
  return true;
}

async function listDocumentFolder(
  ownerId: string,
  prefix: string,
  scope: DocumentScope,
): Promise<{ name: string; url: string; scope: DocumentScope }[]> {
  const folder = `${ownerId}/${prefix}`;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder);
  if (error || !data) {
    console.error('Error listing documents:', error);
    return [];
  }
  return data
    .filter((item) => item.name && item.id)
    .map((item) => ({ name: item.name, url: `${folder}/${item.name}`, scope }));
}

export async function listDocuments(
  causaId: string,
  incidenteId?: string,
): Promise<{ name: string; url: string; scope: DocumentScope }[]> {
  const ownDocuments = await listDocumentFolder(causaId, 'documentos', 'causa');
  if (!incidenteId) return ownDocuments;
  const sharedDocuments = await listDocumentFolder(incidenteId, 'documentos', 'incidente');
  return [...ownDocuments, ...sharedDocuments];
}

export async function deleteDocument(pathOrLegacyUrl: string): Promise<boolean> {
  const path = normalizeDocumentPath(pathOrLegacyUrl);
  if (!path) return false;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    console.error('Error deleting document:', error);
    return false;
  }
  return true;
}
