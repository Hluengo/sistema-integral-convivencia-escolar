/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from "../lib/supabase";

export interface BulkPreviewStudent {
  source_name: string;
  student_id: string | null;
  matched_name: string | null;
  rut: string | null;
  status: "matched" | "missing" | "ambiguous";
  annotation_count: number;
  new_count: number;
  existing_count: number;
  current_letter: string | null;
  pending_letter: string | null;
  duplicates_removed: number;
}

export interface BulkPreviewAnnotation {
  fecha_iso: string;
  tipo: "Positiva" | "Negativa" | "Información";
  categoria: string;
  profesor: string | null;
  /** false cuando el responsable no calza con la nómina; ausente sin nómina. */
  profesorReconocido?: boolean;
  texto: string;
  page_number: number | null;
  student_id: string;
  student_name: string;
}

export interface BulkPreview {
  file_name: string;
  file_hash: string;
  paginas: number;
  detected_course: string;
  course_id: string;
  warnings: string[];
  students: BulkPreviewStudent[];
  annotations: BulkPreviewAnnotation[];
  summary: {
    students_in_file: number;
    students_in_database: number;
    matched_students: number;
    missing_students: number;
    ambiguous_students: number;
    annotations_detected: number;
    annotations_existing?: number;
    annotations_ready: number;
    duplicates_removed: number;
  };
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return payload?.error ?? "No fue posible completar la importación.";
}

export async function previewBulkAnnotations(file: File): Promise<BulkPreview> {
  const token = await getToken();
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/admin/annotations/bulk-preview", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as BulkPreview;
}

export async function confirmBulkAnnotations(
  file: File,
  preview: BulkPreview,
): Promise<{
  imported: number;
  skipped: number;
  course: string;
  pending_cartas: number;
}> {
  const token = await getToken();
  const body = new FormData();
  body.append("file", file);
  body.append("course_id", preview.course_id);
  body.append("file_hash", preview.file_hash);
  const response = await fetch("/api/admin/annotations/bulk-confirm", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as {
    imported: number;
    skipped: number;
    course: string;
    pending_cartas: number;
  };
}
