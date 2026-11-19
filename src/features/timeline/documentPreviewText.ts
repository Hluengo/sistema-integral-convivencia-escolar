/** @license SPDX-License-Identifier: Apache-2.0 */

export type DocumentPreviewKind = "pdf" | "docx" | "text" | "none";

/** Formato previsualizable segun la extension del adjunto guardado. */
export function getDocumentPreviewKind(
  pathOrUrl?: string | null,
): DocumentPreviewKind {
  const match = /\.([a-z0-9]+)(?:$|[?#])/i.exec((pathOrUrl ?? "").trim());
  const extension = match?.[1]?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (extension === "docx") return "docx";
  if (extension === "txt" || extension === "md") return "text";
  return "none";
}
