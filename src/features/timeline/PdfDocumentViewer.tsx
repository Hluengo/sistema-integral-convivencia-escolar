/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useRef, useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { fitPdfPageToWidth } from "./pdfViewerMath";

interface PdfDocumentViewerProps {
  /** URL firmada del bucket privado de Storage (vigencia corta). */
  signedUrl: string;
  /** Titulo del hito, usado en las etiquetas accesibles de cada pagina. */
  title: string;
  /** Alto del area visible; se mantiene la misma clase que el visor anterior. */
  heightClassName: string;
  /** Salida cuando el PDF no se puede dibujar en el navegador. */
  onOpenInNewTab: () => void;
}

type ViewerStatus = "loading" | "ready" | "error";

/**
 * Visor de PDF propio, dibujado con pdf.js sobre <canvas>.
 *
 * A diferencia de un <iframe> o un <object>, el contenido no es un documento
 * embebido: no depende de `frame-src` ni de `object-src`, por lo que ninguna
 * politica de seguridad del sitio puede bloquear el documento. Si el archivo
 * no se puede interpretar (corrupto, cifrado, formato distinto de PDF), el
 * componente degrada a un boton para abrirlo en otra pestaña.
 */
export default function PdfDocumentViewer({
  signedUrl,
  title,
  heightClassName,
  onOpenInNewTab,
}: PdfDocumentViewerProps) {
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const host = pagesRef.current;
    if (!host) return;

    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;

    host.replaceChildren();
    setStatus("loading");
    setPageCount(0);

    const renderDocument = async () => {
      // pdf.js pesa cerca de un megabyte: se carga solo cuando hay un
      // documento que mostrar, nunca en el arranque de la aplicacion.
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

      loadingTask = pdfjs.getDocument({ url: signedUrl });
      const loaded = await loadingTask.promise;
      if (cancelled) return;

      setPageCount(loaded.numPages);
      const availableWidth = host.clientWidth || 640;

      for (let pageNumber = 1; pageNumber <= loaded.numPages; pageNumber += 1) {
        const page = await loaded.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const fit = fitPdfPageToWidth(
          baseViewport.width,
          baseViewport.height,
          availableWidth,
          window.devicePixelRatio,
        );
        const viewport = page.getViewport({ scale: fit.scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        canvas.style.width = `${fit.cssWidth}px`;
        canvas.style.height = "auto";
        canvas.style.maxWidth = "100%";
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          `${title}: pagina ${pageNumber} de ${loaded.numPages}`,
        );

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D no disponible.");

        host.appendChild(canvas);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
      }

      if (!cancelled) setStatus("ready");
    };

    void renderDocument().catch((error: unknown) => {
      if (cancelled) return;
      console.error("No fue posible dibujar el PDF en el visor:", error);
      host.replaceChildren();
      setStatus("error");
    });

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [signedUrl, title]);

  return (
    <div className="relative">
      <div
        ref={pagesRef}
        className={`${heightClassName} flex flex-col items-center gap-2 overflow-auto bg-neutral-200 p-2`}
        data-testid="pdf-canvas-pages"
      />

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-neutral-100/90 text-neutral-600 text-xs">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Cargando documento seguro.
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-50 px-4 text-center"
        >
          <FileWarning className="size-7 text-amber-500" aria-hidden="true" />
          <p className="font-semibold text-neutral-800 text-sm">
            No se pudo mostrar el documento en este espacio.
          </p>
          <p className="max-w-sm text-neutral-500 text-xs">
            El archivo existe y se puede descargar, pero el navegador no logro
            interpretarlo como PDF.
          </p>
          <button
            type="button"
            onClick={onOpenInNewTab}
            className="inline-flex min-h-9 items-center rounded-md bg-brand-600 px-3 py-1.5 font-semibold text-white text-xs hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Abrir documento en otra pestaña
          </button>
        </div>
      )}

      {status === "ready" && pageCount > 0 && (
        <p className="sr-only">
          Documento con {pageCount} pagina{pageCount === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
