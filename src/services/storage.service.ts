/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase';

const STORAGE_BUCKET = 'documentos_convivencia';

/**
 * Upload a document file to Supabase Storage
 * Returns a signed URL or null on failure
 */
export async function uploadDocument(
  causaId: string,
  file: File,
  prefix: string = 'documentos'
): Promise<string | null> {
  const filePath = `${causaId}/${prefix}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading document:', error);
    return null;
  }

  // Get signed URL (expires in 1 hour)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 3600);

  if (signedUrlError) {
    console.error('Error creating signed URL:', signedUrlError);
    return null;
  }

  return signedUrlData?.signedUrl || null;
}

/**
 * List all documents for a causa
 */
export async function listDocuments(causaId: string): Promise<{ name: string; url: string }[]> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(`${causaId}/`);

  if (error || !data) {
    console.error('Error listing documents:', error);
    return [];
  }

  const signedUrls = await Promise.all(
    data.map(async (item) => {
      const filePath = `${causaId}/${item.name}`;
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 3600);

      if (!signedUrlError && signedUrlData?.signedUrl) {
        return { name: item.name, url: signedUrlData.signedUrl };
      }
      return null;
    })
  );

  return signedUrls.filter((r): r is { name: string; url: string } => r !== null);
}

/**
 * Delete a document from storage
 */
export async function deleteDocument(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);

  if (error) {
    console.error('Error deleting document:', error);
    return false;
  }

  return true;
}
