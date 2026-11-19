/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useRef, useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";

interface DocxDocumentViewerProps {
  /** URL firmada del bucket privado de Storage (vigencia corta). */
  signedUrl: string;
  /** Titulo del hito, usado en la etiqueta accesible del documento. */
  title: string;
  /** Alto del area visible; misma clase que el visor de PDF. */
  heightClassName: string;
  /** Salida cuando el Word no se puede dibujar en el navegador. */
  onOpenInNewTab: () => void;
}

type ViewerStatus = "loading" | "ready" | "error";

/**
 * Vista previa de un .docx con su formato original, dibujada en el navegador
 * por docx-preview: conserva parrafos, tablas y estilos del Word sin que el
 * documento salga del cliente. Si el archivo no se puede interpretar, degrada
 * a un boton para abrirlo en otra pestaña.
 */
export default function DocxDocumentViewer({
  signedUrl,
  title,
  heightClassName,
  onOpenInNewTab,
}: DocxDocumentViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ViewerStatus>("loading");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    host.replaceChildren();
    setStatus("loading");

    const renderDocument = async () => {
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (cancelled) return;

      // docx-preview pesa ~200 KB: se carga solo cuando hay un Word que mostrar.
      const { renderAsync } = await import("docx-preview");
      if (cancelled) return;

      await renderAsync(blob, host, undefined, {
        inWrapper: true,
        breakPages: true,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });
      if (!cancelled) setStatus("ready");
    };

    void renderDocument().catch((error: unknown) => {
      if (cancelled) return;
      console.error("No fue posible dibujar el Word en el visor:", error);
      host.replaceChildren();
      setStatus("error");
    });

    return () => {
      cancelled = true;
    };
  }, [signedUrl]);

  return (
    <div className="relative">
      <div
        ref={hostRef}
        className={`${heightClassName} overflow-auto bg-neutral-200 p-2`}
        aria-label={`${title}: vista previa del documento Word`}
        data-testid="docx-preview-pages"
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
            El archivo existe y se puede abrir en otra pestaña.
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
    </div>
  );
}
