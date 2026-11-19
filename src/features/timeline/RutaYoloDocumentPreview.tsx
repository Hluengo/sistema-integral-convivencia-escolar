/** @license SPDX-License-Identifier: Apache-2.0 */

import { lazy, Suspense, useEffect, useState } from "react";
import {
  ExternalLink,
  FileWarning,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { ChecklistItem } from "../../shared/lib/types";
import { openDocument } from "../../shared/api/services/storage.service";
import { getDocumentPreviewKind } from "./documentPreviewText";

const PdfDocumentViewer = lazy(() => import("./PdfDocumentViewer"));
const DocxDocumentViewer = lazy(() => import("./DocxDocumentViewer"));

/** Tope de texto dibujado: un .txt de 10 MB no debe congelar la pestaña. */
const PREVIEW_TEXT_LIMIT = 200_000;

interface RutaYoloDocumentPreviewProps {
  item: ChecklistItem;
  /** URL firmada del bucket privado; vacia si el archivo ya no esta disponible. */
  signedUrl: string;
  expanded: boolean;
  onToggleExpanded: () => void;
}

type TextPreviewState = { text: string } | { failed: true } | null;

function useDocumentText(url: string | null) {
  const [state, setState] = useState<TextPreviewState>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setState(null);

    const load = async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!cancelled) setState({ text });
    };

    void load().catch((error: unknown) => {
      if (cancelled) return;
      console.error("No fue posible mostrar el documento en el visor:", error);
      setState({ failed: true });
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}

export default function RutaYoloDocumentPreview({
  item,
  signedUrl,
  expanded,
  onToggleExpanded,
}: RutaYoloDocumentPreviewProps) {
  const kind = getDocumentPreviewKind(item.documentoUrl);
  const textPreview = useDocumentText(kind === "text" ? signedUrl : null);
  const heightClassName = expanded
    ? "h-[min(78vh,860px)]"
    : "h-[min(52vh,600px)]";
  const textUnavailable =
    kind !== "text" ||
    !signedUrl ||
    (textPreview !== null && "failed" in textPreview);
  const openInNewTab = () => {
    if (item.documentoUrl) void openDocument(item.documentoUrl);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-neutral-200 border-b bg-white px-3 py-2">
        <span className="text-neutral-500 text-xs">
          Vista previa segura del documento
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openInNewTab}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 font-semibold text-neutral-700 text-xs hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Abrir documento en otra pestaña"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Abrir
          </button>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 font-semibold text-neutral-700 text-xs hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label={
              expanded ? "Reducir visor documental" : "Ampliar visor documental"
            }
          >
            {expanded ? (
              <Minimize2 className="size-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-3.5" aria-hidden="true" />
            )}
            {expanded ? "Reducir" : "Ampliar"}
          </button>
        </div>
      </div>
      {kind === "pdf" || kind === "docx" ? (
        <Suspense
          fallback={
            <div className="flex min-h-40 items-center justify-center text-neutral-500 text-xs">
              Cargando visor de documentos.
            </div>
          }
        >
          {kind === "pdf" ? (
            <PdfDocumentViewer
              key={expanded ? "ampliado" : "compacto"}
              signedUrl={signedUrl}
              title={item.label}
              heightClassName={heightClassName}
              onOpenInNewTab={openInNewTab}
            />
          ) : (
            <DocxDocumentViewer
              key={expanded ? "ampliado-w" : "compacto-w"}
              signedUrl={signedUrl}
              title={item.label}
              heightClassName={heightClassName}
              onOpenInNewTab={openInNewTab}
            />
          )}
        </Suspense>
      ) : (
        <div
          className={`${heightClassName} overflow-auto bg-white`}
          data-testid="text-document-preview"
        >
          {!textUnavailable && textPreview === null && (
            <div className="flex h-full items-center justify-center gap-2 text-neutral-600 text-xs">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Cargando documento seguro.
            </div>
          )}
          {textUnavailable && (
            <div
              role="alert"
              className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center"
            >
              <FileWarning
                className="size-7 text-amber-500"
                aria-hidden="true"
              />
              <p className="font-semibold text-neutral-800 text-sm">
                {kind === "none"
                  ? "Este formato no se puede previsualizar."
                  : "No se pudo mostrar el documento en este espacio."}
              </p>
              <p className="max-w-sm text-neutral-500 text-xs">
                El archivo existe y se puede abrir con el botón «Abrir».
              </p>
            </div>
          )}
          {textPreview && "text" in textPreview && (
            <pre className="whitespace-pre-wrap p-4 font-sans text-neutral-800 text-sm leading-relaxed wrap-anywhere">
              {textPreview.text.slice(0, PREVIEW_TEXT_LIMIT)}
              {textPreview.text.length > PREVIEW_TEXT_LIMIT &&
                "\n\n[Vista preliminar truncada. Abre el documento para ver el texto completo.]"}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
