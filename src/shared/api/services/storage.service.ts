/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';

const STORAGE_BUCKET = 'documentos_convivencia';
const SIGNED_URL_TTL_SECONDS = 3600;

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
  causaId: string,
  file: File,
  prefix: string = 'documentos'
): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const filePath = `${causaId}/${prefix}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) {
    console.error('Error uploading document:', error);
    return null;
  }
  return getDocumentSignedUrl(filePath);
}

export async function getDocumentSignedUrl(pathOrLegacyUrl: string): Promise<string | null> {
  const filePath = normalizeDocumentPath(pathOrLegacyUrl);
  if (!filePath) return null;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error('Error creating signed document URL:', error);
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

export async function listDocuments(causaId: string): Promise<{ name: string; url: string }[]> {
  const folder = `${causaId}/documentos`;
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder);
  if (error || !data) {
    console.error('Error listing documents:', error);
    return [];
  }
  const results = await Promise.all(
    data.filter((item) => item.name && item.id).map(async (item) => {
      const path = `${folder}/${item.name}`;
      const url = await getDocumentSignedUrl(path);
      return url ? { name: item.name, url } : null;
    })
  );
  return results.filter((item): item is { name: string; url: string } => item !== null);
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
