/** @license SPDX-License-Identifier: Apache-2.0 */

import { useState } from 'react';
import { ScrollText, Download } from 'lucide-react';
import type { CartaDisciplinaria } from '@/src/shared/lib/types';
import { formatDate } from './constants';
import { downloadCartaPdf } from '../docgen/downloadCartaPdf';

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  Vigente: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  Pendiente: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Cumplida: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Incumplida: { bg: 'bg-red-100', text: 'text-red-800' },
  Anulada: { bg: 'bg-neutral-100', text: 'text-neutral-500' },
};

const LETTER_TYPE_LABEL: Record<string, string> = {
  'Amonestación Escrita': 'Carta de Amonestación',
  'Carta de Compromiso Conductual': 'Carta de Compromiso Conductual',
};

interface HistoryTabProps {
  cartas: CartaDisciplinaria[];
}

export default function HistoryTab({ cartas }: HistoryTabProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (carta: CartaDisciplinaria) => {
    setDownloadingId(carta.id);
    try {
      await downloadCartaPdf(carta, {
        full_name: carta.student_name,
        course_name: carta.course,
        rut: '',
      });
    } catch (err) {
      console.error('Error al descargar PDF:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  if (cartas.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-8 text-center shadow-xs">
        <ScrollText className="mx-auto mb-3 h-12 w-12 text-neutral-300" />
        <p className="text-neutral-500 text-sm">
          Este estudiante no tiene cartas emitidas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cartas.map((carta) => {
        const badge = STATUS_BADGE[carta.status] || STATUS_BADGE.Vigente;
        const isDownloading = downloadingId === carta.id;
        return (
          <div
            key={carta.id}
            className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-neutral-900 text-sm">
                    {LETTER_TYPE_LABEL[carta.letter_type] || carta.letter_type}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 font-semibold text-[10px] ${badge.bg} ${badge.text}`}>
                    {carta.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-neutral-500 text-xs">
                  <span>Emitida: {carta.emission_date ? formatDate(carta.emission_date) : '-'}</span>
                  <span>Apoderado: {carta.apoderado_name || '-'}</span>
                  {carta.emitted_by && <span>Por: {carta.emitted_by}</span>}
                </div>
                {carta.observations && (
                  <p className="mt-2 text-neutral-600 text-sm leading-relaxed">{carta.observations}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDownload(carta)}
                disabled={isDownloading}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1.5 font-medium text-brand-700 text-xs transition-colors hover:bg-brand-100 disabled:opacity-50"
                title="Descargar PDF"
              >
                <Download className={`h-3.5 w-3.5 ${isDownloading ? 'animate-pulse' : ''}`} />
                {isDownloading ? 'PDF...' : 'PDF'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
