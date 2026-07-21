/** @license SPDX-License-Identifier: Apache-2.0 */

import { memo } from 'react';
import { Scale, FileText, Sparkles, BookOpen, ChevronRight, AlertTriangle } from 'lucide-react';
import type { UnifiedDocument } from '../types/documentHub.types';
import { formatDateES } from '../utils/documentHub.utils';

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  Vigente: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  Pendiente: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  Cumplida: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  Incumplida: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  Anulada: { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
};

const FASE_BADGE: Record<string, { bg: string; text: string }> = {
  Recepci\u00f3n: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Investigaci\u00f3n: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Resoluci\u00f3n: { bg: 'bg-purple-100', text: 'text-purple-800' },
  Apelaci\u00f3n: { bg: 'bg-orange-100', text: 'text-orange-800' },
  Seguimiento: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
};

interface DocumentCardProps {
  documento: UnifiedDocument;
  onClick: (doc: UnifiedDocument) => void;
}

export default memo(function DocumentCard({ documento, onClick }: DocumentCardProps) {
  const isCausa = documento.source === 'causa';
  const badge = isCausa
    ? null
    : documento.anotacionData
      ? STATUS_BADGE[documento.anotacionData.status] || STATUS_BADGE.Vigente
      : null;

  const faseBadge = isCausa && documento.causaData
    ? FASE_BADGE[documento.causaData.fase] || FASE_BADGE.Investigaci\u00f3n
    : null;

  return (
    <button
      type="button"
      onClick={() => onClick(documento)}
      className="flex w-full items-center gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 text-left shadow-xs transition-all hover:border-brand-200 hover:shadow-md"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isCausa ? 'bg-brand-50' : 'bg-indigo-50'
        }`}
      >
        {isCausa ? (
          <Scale className="h-5 w-5 text-brand-600" />
        ) : (
          <FileText className="h-5 w-5 text-indigo-600" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="font-bold text-neutral-900 text-sm truncate">
            {documento.titulo}
          </h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold text-[10px] ${isCausa ? 'bg-brand-100 text-brand-700' : 'bg-indigo-100 text-indigo-700'}`}>
            {isCausa ? 'Causa' : 'Anotaci\u00f3n'}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-500 text-xs">
          <span className="font-medium text-neutral-700">{documento.estudiante}</span>
          {documento.curso && (
            <span className="text-neutral-400">{documento.curso}</span>
          )}
          <span className="text-neutral-400">{formatDateES(documento.fecha)}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isCausa && documento.causaData && (
            <>
              {documento.causaData.aulaSegura && (
                <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-bold text-[10px] text-red-600">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  AULA SEGURA
                </span>
              )}
              {faseBadge && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold text-[10px] ${faseBadge.bg} ${faseBadge.text}`}>
                  {documento.causaData.fase}
                </span>
              )}
            </>
          )}

          {!isCausa && badge && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold text-[10px] ${badge.bg} ${badge.text}`}>
              <span className={`inline-block size-1.5 rounded-full ${badge.dot}`} />
              {documento.estado}
            </span>
          )}
        </div>

        {isCausa && (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 font-semibold text-[10px] text-brand-700">
              <Sparkles className="h-2.5 w-2.5" />
              IA Disponible
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {isCausa ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 text-[10px] transition-colors group-hover:bg-brand-100">
              <Sparkles className="h-3 w-3" />
              Analizar IA
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-semibold text-neutral-600 text-[10px] transition-colors group-hover:bg-neutral-100">
              <BookOpen className="h-3 w-3" />
              Abrir Causa
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 text-[10px] transition-colors">
            <FileText className="h-3 w-3" />
            Ver Carta
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-neutral-300" />
      </div>
    </button>
  );
});
