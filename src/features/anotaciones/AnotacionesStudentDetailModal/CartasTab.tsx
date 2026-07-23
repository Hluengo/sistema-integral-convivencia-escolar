/** @license SPDX-License-Identifier: Apache-2.0 */

import { lazy, Suspense, useState } from 'react';
import { Download, Eye, FileText, Plus, Printer, RotateCw, XCircle } from 'lucide-react';
import type { Annotation, CartaDisciplinaria } from '@/src/shared/lib/types';
import { TEACHERS_BY_COURSE } from '@/src/lib/anotacionesUtils';
import {
  annulCarta,
  fetchCartaAnnotations,
  updateCartaStatus,
  type CartaStatus,
} from '@/src/services/cartas.service';
import {
  downloadHistoricalCartaPdf,
  printHistoricalCarta,
} from '@/src/features/anotaciones/docgen/letterPrintService';
import {
  getSuggestedLetterType,
  mapDocTypeToLetterType,
  type LetterDocType,
} from '@/src/shared/lib/domain/disciplinaryStage';
import { formatDate, STATUS_BADGE, type StudentInfo } from './constants';

const AnotacionesDocumentGenerator = lazy(() => import('../AnotacionesDocumentGenerator'));

interface CartasTabProps {
  student: StudentInfo;
  annotations: Annotation[];
  cartas: CartaDisciplinaria[];
  counts: { negativas: number; positivas: number; informativas: number };
  currentCarta: CartaDisciplinaria | null;
  privacyMode: boolean;
  teachers?: Record<string, string>;
  onRefresh: () => void | Promise<void>;
}

const STATUS_OPTIONS: CartaStatus[] = ['Vigente', 'Cumplida', 'Incumplida', 'Anulada'];

export default function CartasTab({
  student,
  annotations,
  cartas,
  counts,
  currentCarta,
  privacyMode,
  teachers = TEACHERS_BY_COURSE,
  onRefresh,
}: CartasTabProps) {
  const suggestedDocType = getSuggestedLetterType(counts.negativas, currentCarta?.letter_type);
  const [showGenerator, setShowGenerator] = useState(false);
  const [initialDocType, setInitialDocType] = useState<LetterDocType | undefined>(suggestedDocType || undefined);
  const [busyCartaId, setBusyCartaId] = useState<string | null>(null);
  const [previewCarta, setPreviewCarta] = useState<CartaDisciplinaria | null>(null);

  const refreshAfterChange = async () => {
    await onRefresh();
  };

  const handleStatusChange = async (carta: CartaDisciplinaria, status: CartaStatus) => {
    let reason: string | undefined;
    if (status === 'Anulada') {
      reason = window.prompt('Motivo de anulación') || undefined;
      if (!reason) return;
    }
    setBusyCartaId(carta.id);
    const ok = status === 'Anulada' ? await annulCarta(carta.id, reason || 'Anulación administrativa') : await updateCartaStatus(carta.id, status, reason);
    setBusyCartaId(null);
    if (ok) await refreshAfterChange();
  };

  const handlePrint = async (carta: CartaDisciplinaria) => {
    setBusyCartaId(carta.id);
    const cartaAnnotations = await fetchCartaAnnotations(carta);
    await printHistoricalCarta(
      carta,
      { full_name: student.full_name, course_name: student.course_name, course_id: student.course_id, rut: student.rut },
      cartaAnnotations
    );
    setBusyCartaId(null);
  };

  const handleDownload = async (carta: CartaDisciplinaria) => {
    setBusyCartaId(carta.id);
    const cartaAnnotations = await fetchCartaAnnotations(carta);
    await downloadHistoricalCartaPdf(
      carta,
      {
        full_name: student.full_name,
        course_name: student.course_name,
        course_id: student.course_id,
        rut: student.rut,
      },
      cartaAnnotations
    );
    setBusyCartaId(null);
  };

  const openGenerator = (docType?: LetterDocType) => {
    setInitialDocType(docType || suggestedDocType || undefined);
    setShowGenerator(true);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <FileText className="h-4 w-4 text-brand-600" />
              Cartas existentes
            </h3>
            <p className="mt-1 text-xs text-neutral-500">Fuente oficial: cartas_disciplinarias.</p>
          </div>
          <button type="button" onClick={() => openGenerator()} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" />
            Crear nueva carta
          </button>
        </div>

        {cartas.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No hay cartas registradas para este estudiante.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {cartas.map((carta) => {
              const badge = STATUS_BADGE[carta.status] || STATUS_BADGE.Vigente;
              const isBusy = busyCartaId === carta.id;
              return (
                <article key={carta.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-neutral-900">{carta.letter_type}</h4>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                          {carta.status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-neutral-500 sm:grid-cols-2">
                        <span>Emisión: {formatDate(carta.emission_date)}</span>
                        <span>Apoderado: {carta.apoderado_name || '-'}</span>
                        <span>Emitido por: {carta.emitted_by || '-'}</span>
                        <span>Anotaciones consideradas: {carta.annotations_count}</span>
                      </div>
                      {carta.observations && <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{carta.observations}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setPreviewCarta(carta)} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                      <button type="button" onClick={() => void handlePrint(carta)} disabled={isBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
                        <Printer className="h-3.5 w-3.5" /> Imprimir
                      </button>
                      <button type="button" onClick={() => void handleDownload(carta)} disabled={isBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                      <select
                        value={carta.status}
                        onChange={(event) => void handleStatusChange(carta, event.target.value as CartaStatus)}
                        disabled={isBusy}
                        className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-semibold text-neutral-700 outline-none focus:border-brand-400"
                        aria-label={`Cambiar estado de ${carta.letter_type}`}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => openGenerator()} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                        <RotateCw className="h-3.5 w-3.5" /> Nueva desde etapa
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {previewCarta && (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">Vista rápida de carta</h3>
            <button type="button" onClick={() => setPreviewCarta(null)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-white hover:text-neutral-700" aria-label="Cerrar vista">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
          <div className="rounded-lg bg-white p-4 text-sm text-neutral-600">
            <p className="font-bold text-neutral-900">{previewCarta.letter_type}</p>
            <p className="mt-1">Fecha: {formatDate(previewCarta.emission_date)}</p>
            <p>Apoderado: {previewCarta.apoderado_name || '-'}</p>
            <p>Emitido por: {previewCarta.emitted_by || '-'}</p>
            <p>Supervisor/a: {previewCarta.supervisor_name || '-'}</p>
            <p>Estado: {previewCarta.status}</p>
            <p className="mt-3 whitespace-pre-wrap">{previewCarta.observations || 'Sin observaciones.'}</p>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Crear nueva carta</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Sugerencia actual: {mapDocTypeToLetterType(suggestedDocType) || 'sin carta'}.
            </p>
          </div>
          {showGenerator && (
            <button type="button" onClick={() => setShowGenerator(false)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
              Ocultar generador
            </button>
          )}
        </div>
        {!showGenerator ? (
          <button type="button" onClick={() => openGenerator()} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <Plus className="h-4 w-4" />
            Abrir generador de cartas
          </button>
        ) : (
          <Suspense fallback={<div className="py-10 text-center text-sm text-neutral-500">Cargando generador...</div>}>
            <AnotacionesDocumentGenerator
              student={{
                id: student.id,
                full_name: student.full_name,
                course_id: student.course_name || student.course_id,
                rut: student.rut,
                teacher_id: student.teacher_id,
              }}
              annotations={annotations}
              privacyMode={privacyMode}
              teachers={teachers}
              initialDocType={initialDocType}
              onRegistered={() => void refreshAfterChange()}
            />
          </Suspense>
        )}
      </section>
    </div>
  );
}