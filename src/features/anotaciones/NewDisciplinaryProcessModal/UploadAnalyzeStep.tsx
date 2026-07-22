/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Loader2, AlertTriangle, Star } from 'lucide-react';
import type { AnnotationSummary } from '@/src/shared/lib/types';

interface UploadAnalyzeStepProps {
  file: File | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  summary: AnnotationSummary | null;
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
}

export default function UploadAnalyzeStep({
  file,
  isAnalyzing,
  analysisError,
  summary,
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
      if (f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.md')))
        onFileChange(f);
    },
    [onFileChange]
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onFileChange(e.target.files[0]);
  };

  const total = summary ? summary.negativas + summary.positivas + summary.informativas : 0;

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 font-medium text-neutral-600 text-sm">
        <Upload className="h-4 w-4 text-indigo-600" /> Subir Hoja de Vida (PDF o .md)
      </p>

      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors${
          drag ? 'border-indigo-500 bg-indigo-50' : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        <input ref={fileRef} type="file" accept=".pdf,.md" onChange={onPick} className="hidden" />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-neutral-400" />
          <p className="text-neutral-500 text-sm">
            Arrastra un PDF o .md, o haz clic para seleccionar
          </p>
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
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {isAnalyzing ? 'Analizando...' : 'Subir y Analizar'}
        </button>
      )}

      {analysisError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{analysisError}</span>
        </div>
      )}

      {summary && total > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-medium text-neutral-700 text-sm">
            <Star className="h-4 w-4 text-indigo-600" /> Resultado del Análisis
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="font-bold text-2xl text-red-700">{summary.negativas}</p>
              <p className="mt-1 font-medium text-red-600 text-xs">Negativas</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="font-bold text-2xl text-emerald-700">{summary.positivas}</p>
              <p className="mt-1 font-medium text-emerald-600 text-xs">Positivas</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="font-bold text-2xl text-blue-700">{summary.informativas}</p>
              <p className="mt-1 font-medium text-blue-600 text-xs">Informativas</p>
            </div>
          </div>
          <p className="text-center font-medium text-neutral-500 text-xs">
            Total: {total} anotaciones detectadas
          </p>
        </div>
      )}

      {!isAnalyzing && !analysisError && !summary && file && (
        <p className="py-4 text-center text-neutral-500 text-sm">
          Haz clic en "Subir y Analizar" para procesar el documento.
        </p>
      )}
    </div>
  );
}
