/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from "../lib/supabase";

const DISCIPLINARY_BUCKET = "disciplinary-processes";
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
  const base = name.split(/[\\/]/).pop() || "documento.pdf";
  const withoutExtension = base.replace(/\.pdf$/i, "");
  return `${withoutExtension}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function validateDisciplinaryPdf(file: File): string | null {
  if (file.type && file.type !== "application/pdf") {
    return "Solo se permiten archivos PDF.";
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "El archivo debe tener extensión .pdf.";
  }

  if (file.size > MAX_DISCIPLINARY_PDF_BYTES) {
    return "El PDF supera el tamaño máximo de 10 MB.";
  }

  if (file.size === 0) {
    return "El PDF está vacío.";
  }

  return null;
}

export async function uploadDisciplinaryFile(
  file: File,
  tenantId: string,
  studentId?: string | null,
  processId?: string | null,
): Promise<UploadedDisciplinaryFile | null> {
  const validationError = validateDisciplinaryPdf(file);
  if (validationError) throw new Error(validationError);

  const randomId = crypto.randomUUID();
  const safeBaseName = sanitizeFileName(file.name) || "documento";
  const storedName = `${randomId}-${safeBaseName}.pdf`;
  const studentSegment = studentId || "pending-student";
  const processSegment = processId || "draft";
  const storagePath = `${tenantId}/${studentSegment}/${processSegment}/${storedName}`;

  const { error } = await supabase.storage
    .from(DISCIPLINARY_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });

  if (error) {
    console.error("Error uploading disciplinary file:", error);
    throw new Error("No fue posible subir el PDF al almacenamiento privado.");
  }

  return {
    bucket: DISCIPLINARY_BUCKET,
    storagePath,
    originalName: file.name,
    storedName,
    mimeType: "application/pdf",
    size: file.size,
  };
}

export async function deleteDisciplinaryFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(DISCIPLINARY_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error("Error deleting disciplinary file:", error);
  }
}

export async function restoreDisciplinaryFile(
  input: UploadedDisciplinaryFile,
  tenantId: string,
  expectedHash: string,
  analysisId: string | null,
): Promise<File> {
  if (
    !tenantId ||
    input.bucket !== DISCIPLINARY_BUCKET ||
    !input.storagePath.startsWith(`${tenantId}/`) ||
    /[\\%]/.test(input.storagePath) ||
    input.storagePath
      .split("/")
      .some((part) => !part || part === "." || part === "..") ||
    !/^[a-f0-9]{64}$/i.test(expectedHash) ||
    !analysisId
  )
    throw new Error(
      "No fue posible reabrir el borrador: revise su colegio, archivo y análisis.",
    );

  const { data: analysis, error: analysisError } = await supabase
    .from("document_analyses")
    .select("id,file_hash,status")
    .eq("tenant_id", tenantId)
    .eq("id", analysisId)
    .maybeSingle();
  if (analysisError || !analysis || analysis.file_hash !== expectedHash) {
    throw new Error(
      "El análisis guardado no coincide con el archivo o ya no está disponible.",
    );
  }
  if (analysis.status === "confirmed") {
    throw new Error(
      "Este análisis ya fue confirmado. Revise el historial antes de continuar; su borrador se conservó.",
    );
  }
  const { data: blob, error } = await supabase.storage
    .from(input.bucket)
    .download(input.storagePath);
  if (error || !blob)
    throw new Error(
      "No fue posible reabrir el PDF privado. Su revisión se conserva para reintentar.",
    );
  if (blob.size > MAX_DISCIPLINARY_PDF_BYTES || blob.size !== input.size) {
    throw new Error(
      "El archivo guardado no coincide con el tamaño del PDF original.",
    );
  }
  const bytes = await blob.arrayBuffer();
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (
    hash !== expectedHash ||
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  ) {
    throw new Error("El archivo guardado no coincide con el PDF analizado.");
  }
  return new File([blob], input.originalName, { type: "application/pdf" });
}
