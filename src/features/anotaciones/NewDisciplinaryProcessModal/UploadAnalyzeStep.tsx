/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Loader2, AlertTriangle, Star } from 'lucide-react';
import type { AnnotationSummary } from '@/src/shared/lib/types';
import { MAX_DISCIPLINARY_PDF_BYTES, validateDisciplinaryPdf } from '@/src/shared/api/services/disciplinary-storage.service';

interface UploadAnalyzeStepProps {
  file: File | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  summary: AnnotationSummary | null;
  statusLabel?: string;
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadAnalyzeStep({
  file,
  isAnalyzing,
  analysisError,
  summary,
  statusLabel,
  onFileChange,
  onAnalyze,
}: UploadAnalyzeStepProps) {
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectFile = useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return;
      const validationError = validateDisciplinaryPdf(candidate);
      setLocalError(validationError);
      onFileChange(validationError ? null : candidate);
    },
    [onFileChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      selectFile(e.dataTransfer.files[0]);
    },
    [selectFile]
  );

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0]);
  };

  const total = summary ? summary.negativas + summary.positivas + summary.informativas : 0;
  const visibleError = localError || analysisError;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="flex items-center gap-2 font-medium text-neutral-700 text-sm">
          <Upload className="h-4 w-4 text-indigo-600" /> Subir hoja de vida en PDF
        </p>
        <p className="text-neutral-500 text-xs">
          Archivo privado, máximo {formatBytes(MAX_DISCIPLINARY_PDF_BYTES)}. El análisis se ejecuta en backend.
        </p>
      </div>

      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        disabled={isAnalyzing}
        aria-label={'Seleccionar PDF de hoja de vida'}
        className={`w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-70${
          drag ? 'border-indigo-500 bg-indigo-50' : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" aria-label="Seleccionar PDF" onChange={onPick} className="hidden" />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-neutral-400" />
          <p className="text-neutral-500 text-sm">Arrastra un PDF o haz clic para seleccionar</p>
          {file && (
            <p className="font-medium text-indigo-600 text-xs">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
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
          {isAnalyzing ? statusLabel || 'Analizando...' : 'Analizar PDF'}
        </button>
      )}

      {visibleError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{visibleError}</span>
        </div>
      )}

      {summary && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 font-medium text-neutral-700 text-sm">
            <Star className="h-4 w-4 text-indigo-600" /> Resultado del análisis
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
          <p className="text-center font-medium text-neutral-500 text-xs">Total: {total} anotaciones detectadas</p>
        </div>
      )}
    </div>
  );
}
