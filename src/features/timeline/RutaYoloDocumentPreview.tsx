/** @license SPDX-License-Identifier: Apache-2.0 */

import { lazy, Suspense } from "react";
import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import type { ChecklistItem } from "../../shared/lib/types";
import { openDocument } from "../../shared/api/services/storage.service";

const PdfDocumentViewer = lazy(() => import("./PdfDocumentViewer"));

interface RutaYoloDocumentPreviewProps {
  item: ChecklistItem;
  pdfUrl: string;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export default function RutaYoloDocumentPreview({
  item,
  pdfUrl,
  expanded,
  onToggleExpanded,
}: RutaYoloDocumentPreviewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-neutral-200 border-b bg-white px-3 py-2">
        <span className="text-neutral-500 text-xs">
          Vista previa segura del documento
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (item.documentoUrl) void openDocument(item.documentoUrl);
            }}
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
      <Suspense
        fallback={
          <div className="flex min-h-40 items-center justify-center text-neutral-500 text-xs">
            Cargando visor de documentos.
          </div>
        }
      >
        <PdfDocumentViewer
          key={expanded ? "ampliado" : "compacto"}
          signedUrl={pdfUrl}
          title={item.label}
          heightClassName={
            expanded ? "h-[min(78vh,860px)]" : "h-[min(52vh,600px)]"
          }
          onOpenInNewTab={() => {
            if (item.documentoUrl) void openDocument(item.documentoUrl);
          }}
        />
      </Suspense>
    </div>
  );
}
