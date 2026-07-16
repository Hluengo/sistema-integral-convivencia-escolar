/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useCallback } from 'react';
import { X, Upload, FileText, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDate, SEVERITY_BADGE, type StudentInfo } from './constants';

interface UploadPdfTabProps {
  student: StudentInfo;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  isParsing: boolean;
  parsingStatus: string;
  errorMessage: string | null;
  setErrorMessage: (v: string | null) => void;
  parsedAnnotations: unknown[];
  onDrop: (e: React.DragEvent) => Promise<void>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRegisterParsed: () => Promise<void>;
}

export default function UploadPdfTab({
  isDragging,
  setIsDragging,
  isParsing,
  parsingStatus,
  errorMessage,
  setErrorMessage,
  parsedAnnotations,
  onDrop,
  onFileSelect,
  onRegisterParsed,
}: UploadPdfTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLButtonElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, [setIsDragging]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div className="space-y-5">
      <button
        ref={dropZoneRef}
        type="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          isDragging
            ? 'border-brand-400 bg-brand-50/50 shadow-lg'
            : 'border-neutral-300 bg-white hover:border-brand-300 hover:bg-brand-50/20'
        } ${isParsing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={onFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          {isParsing ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              </div>
              <p className="font-medium text-brand-600 text-sm">{parsingStatus}</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <Upload className="h-6 w-6 text-neutral-400" />
              </div>
              <div>
                <p className="font-medium text-neutral-700 text-sm">
                  Arrastra un PDF de Hoja de Vida o haz clic para seleccionar
                </p>
                <p className="mt-1 text-neutral-400 text-xs">Solo archivos PDF - Maximo 10 MB</p>
              </div>
            </>
          )}
        </div>
      </button>

      {parsingStatus && !isParsing && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            parsingStatus.includes('exitosamente') || parsingStatus.includes('detectaron')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : parsingStatus.includes('Error')
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-neutral-200 bg-neutral-50 text-neutral-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {parsingStatus.includes('exitosamente') || parsingStatus.includes('detectaron') ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            ) : parsingStatus.includes('Error') ? (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
            ) : (
              <FileText className="h-4 w-4 flex-shrink-0 text-neutral-500" />
            )}
            <span>{parsingStatus}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <span>{errorMessage}</span>
            <button
              type="button"
              aria-label="Cerrar mensaje"
              onClick={() => setErrorMessage(null)}
              className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {parsedAnnotations.length > 0 && (
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-neutral-900 text-sm">
            <FileText className="h-4 w-4 text-brand-600" />
            Anotaciones Detectadas ({parsedAnnotations.length})
          </h3>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {parsedAnnotations.map((ann: unknown, index: number) => {
              const a = ann as Record<string, string | undefined>;
              const severity = a.severity || 'Leve';
              const badge = SEVERITY_BADGE[severity] || SEVERITY_BADGE.Leve;
              return (
                <div
                  key={a.id || a.text || a.observation || index}
                  className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3"
                >
                  <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full${badge.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider${badge.bg} ${badge.text}`}>
                        {severity}
                      </span>
                      <span className="font-medium text-[10px] text-neutral-400 uppercase">
                        {a.type || 'Negativa'}
                      </span>
                    </div>
                    <p className="text-neutral-700 text-sm">
                      {a.text || a.observation || 'Sin descripcion'}
                    </p>
                    {a.date && <p className="mt-1 text-neutral-400 text-xs">{formatDate(a.date)}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onRegisterParsed}
            disabled={isParsing || parsedAnnotations.length === 0}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Registrar {parsedAnnotations.length} Anotacione
            {parsedAnnotations.length === 1 ? 'n' : 's'}
          </button>
        </div>
      )}
    </div>
  );
}
