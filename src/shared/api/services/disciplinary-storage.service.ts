/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

const BUCKET = 'disciplinary-processes';

export async function uploadDisciplinaryFile(
  studentId: string,
  file: File,
  tenantId: string
): Promise<string | null> {
  const filePath = `${tenantId}/${studentId}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('Error uploading disciplinary file:', error);
    return null;
  }

  return filePath;
}

export async function getDisciplinaryFileUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600);

  if (error || !data) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}
