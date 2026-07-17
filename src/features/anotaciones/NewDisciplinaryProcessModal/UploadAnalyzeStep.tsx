/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Loader2, AlertTriangle, Star } from 'lucide-react';

interface UploadAnalyzeStepProps {
  file: File | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  detected: unknown[];
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
  onRetry?: () => void;
}

export default function UploadAnalyzeStep({
  file,
  isAnalyzing,
  analysisError,
  detected,
  onFileChange,
  onAnalyze,
}: UploadAnalyzeStepProps) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (f && f.type === 'application/pdf') onFileChange(f);
    },
    [onFileChange]
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onFileChange(e.target.files[0]);
  };

  const severityDot = (severity?: string) => {
    switch (severity) {
      case 'Leve': return 'bg-emerald-500';
      case 'Grave': return 'bg-yellow-500';
      case 'Muy Grave': return 'bg-orange-500';
      default: return 'bg-rose-500';
    }
  };

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 font-medium text-neutral-600 text-sm">
        <Upload className="h-4 w-4 text-indigo-600" /> Subir Hoja de Vida (PDF)
      </p>

      <button
        type="button"
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all${
          drag ? 'border-indigo-500 bg-indigo-50' : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        <input ref={fileRef} type="file" accept=".pdf" onChange={onPick} className="hidden" />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-neutral-400" />
          <p className="text-neutral-500 text-sm">Arrastra un PDF o haz clic para seleccionar</p>
          {file && <p className="font-medium text-indigo-600 text-xs">{file.name}</p>}
        </div>
      </button>

      {file && (
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 font-medium text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {isAnalyzing ? 'Analizando...' : 'Subir y Analizar'}
        </button>
      )}

      {analysisError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {detected.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-medium text-neutral-700 text-sm">
            <Star className="h-4 w-4 text-indigo-600" /> Análisis del Documento
          </p>
          <p className="font-medium text-neutral-700 text-xs">
            Se detectaron {detected.length} anotaciones:
          </p>
          {detected.map((a: unknown, i: number) => {
            const ann = a as { id?: string; date?: string; text?: string; severity?: string; type?: string; registered_by?: string };
            return (
              <div
                key={ann.id || ann.date + (ann.text || '') || i}
                className="flex items-start gap-2 rounded-lg border border-neutral-100 bg-neutral-50 p-2.5"
              >
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${severityDot(ann.severity)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-neutral-400 text-xs">{ann.date || 'Sin fecha'}</p>
                  <p className="text-neutral-700 text-sm">{ann.text}</p>
                  <p className="text-neutral-400 text-xs">
                    {ann.registered_by} - {ann.severity} ({ann.type})
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isAnalyzing && !analysisError && detected.length === 0 && file && (
        <p className="py-4 text-center text-neutral-500 text-sm">
          Haz clic en "Subir y Analizar" para procesar el documento.
        </p>
      )}
    </div>
  );
}
