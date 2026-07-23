/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from '../lib/supabase';

export const DISCIPLINARY_BUCKET = 'disciplinary-processes';
export const MAX_DISCIPLINARY_PDF_BYTES = 10 * 1024 * 1024;

export interface UploadedDisciplinaryFile {
  bucket: string;
  storagePath: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'documento.pdf';
  const withoutExtension = base.replace(/\.pdf$/i, '');
  return `${withoutExtension}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function validateDisciplinaryPdf(file: File): string | null {
  if (file.type && file.type !== 'application/pdf') {
    return 'Solo se permiten archivos PDF.';
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return 'El archivo debe tener extensión .pdf.';
  }

  if (file.size > MAX_DISCIPLINARY_PDF_BYTES) {
    return 'El PDF supera el tamaño máximo de 10 MB.';
  }

  if (file.size === 0) {
    return 'El PDF está vacío.';
  }

  return null;
}

export async function uploadDisciplinaryFile(
  file: File,
  tenantId: string,
  studentId?: string | null,
  processId?: string | null
): Promise<UploadedDisciplinaryFile | null> {
  const validationError = validateDisciplinaryPdf(file);
  if (validationError) throw new Error(validationError);

  const randomId = crypto.randomUUID();
  const safeBaseName = sanitizeFileName(file.name) || 'documento';
  const storedName = `${randomId}-${safeBaseName}.pdf`;
  const studentSegment = studentId || 'pending-student';
  const processSegment = processId || 'draft';
  const storagePath = `${tenantId}/${studentSegment}/${processSegment}/${storedName}`;

  const { error } = await supabase.storage.from(DISCIPLINARY_BUCKET).upload(storagePath, file, {
    cacheControl: '3600',
    contentType: 'application/pdf',
    upsert: false,
  });

  if (error) {
    console.error('Error uploading disciplinary file:', error);
    throw new Error('No fue posible subir el PDF al almacenamiento privado.');
  }

  return {
    bucket: DISCIPLINARY_BUCKET,
    storagePath,
    originalName: file.name,
    storedName,
    mimeType: 'application/pdf',
    size: file.size,
  };
}

export async function getDisciplinaryFileUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(DISCIPLINARY_BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error || !data) {
    console.error('Error creating signed URL:', error);
    return null;
  }

  return data.signedUrl;
}
export async function deleteDisciplinaryFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(DISCIPLINARY_BUCKET).remove([filePath]);

  if (error) {
    console.error('Error deleting disciplinary file:', error);
  }
}
