/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useEffect } from 'react';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/src/shared/api/lib/supabase';

interface PdfViewerProps {
  pdfPath: string;
  onClose: () => void;
}

export default function PdfViewer({ pdfPath, onClose }: PdfViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: urlError } = await supabase.storage
          .from('anotaciones')
          .createSignedUrl(pdfPath, 3600);
        if (cancelled) return;
        if (urlError || !data?.signedUrl) {
          setError('No se pudo generar el enlace al documento.');
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch {
        if (!cancelled) setError('Error al conectar con el almacenamiento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pdfPath]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-[90vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h3 className="flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <ExternalLink className="h-4 w-4 text-brand-600" />
            Visor de Documento PDF
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Cerrar visor de PDF"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-neutral-500 text-sm">{error}</p>
            </div>
          ) : signedUrl ? (
            <iframe
              src={signedUrl}
              className="h-full w-full border-0"
              title="Visor de documento PDF"
              sandbox="allow-same-origin"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
