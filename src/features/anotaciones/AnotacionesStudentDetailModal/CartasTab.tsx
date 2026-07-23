/** @license SPDX-License-Identifier: Apache-2.0 */

import { lazy, Suspense, useState } from 'react';
import { Ban, CheckCircle2, Download, FileText, Printer, Save, XCircle } from 'lucide-react';
import type { Annotation, CartaDisciplinaria } from '@/src/shared/lib/types';
import { TEACHERS_BY_COURSE } from '@/src/lib/anotacionesUtils';
import {
  annulCarta,
  createCartaEvent,
  createPendingCartaForStudent,
  fetchCartaAnnotations,
  getCartaWorkflowLabel,
  markCartaDownloadedPdf,
  markCartaDownloadedWord,
  markCartaPrinted,
  markCartaProcessedManually,
  resolveCartaWorkflowStatus,
} from '@/src/services/cartas.service';
import {
  downloadHistoricalCartaPdf,
  printHistoricalCarta,
} from '@/src/features/anotaciones/docgen/letterPrintService';
import {
  getSuggestedLetterType,
  mapDocTypeToLetterType,
  mapLetterTypeToDocType,
  type LetterDocType,
} from '@/src/shared/lib/domain/disciplinaryStage';
import { formatDate, type StudentInfo } from './constants';

const AnotacionesDocumentGenerator = lazy(() => import('../AnotacionesDocumentGenerator'));

interface PendingCartaSuggestion {
  docType: LetterDocType;
  negativeCount: number;
  source: 'pdf' | 'supabase';
}

interface CartasTabProps {
  student: StudentInfo;
  annotations: Annotation[];
  cartas: CartaDisciplinaria[];
  counts: { negativas: number; positivas: number; informativas: number };
  currentCarta: CartaDisciplinaria | null;
  pendingSuggestion?: PendingCartaSuggestion | null;
  privacyMode: boolean;
  teachers?: Record<string, string>;
  onRefresh: () => void | Promise<void>;
}

function downloadCartaWordFile(carta: CartaDisciplinaria, student: StudentInfo) {
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>
    <h1>${carta.letter_type}</h1>
    <p><strong>Estudiante:</strong> ${student.full_name}</p>
    <p><strong>Curso:</strong> ${student.course_name || student.course_id || '-'}</p>
    <p><strong>RUN:</strong> ${student.rut || '-'}</p>
    <p><strong>Fecha:</strong> ${carta.emission_date}</p>
    <p><strong>Estado del trámite:</strong> ${getCartaWorkflowLabel(carta)}</p>
    <p><strong>Anotaciones negativas consideradas:</strong> ${carta.annotations_count}</p>
    <p><strong>Observaciones:</strong></p>
    <p>${carta.observations || 'Sin observaciones.'}</p>
  </body></html>`;
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${carta.letter_type.replace(/\s+/g, '_')}_${student.full_name.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function CartasTab({
  student,
  annotations,
  cartas,
  counts,
  currentCarta,
  pendingSuggestion,
  privacyMode,
  teachers = TEACHERS_BY_COURSE,
  onRefresh,
}: CartasTabProps) {
  const suggestedDocType = pendingSuggestion?.docType ?? getSuggestedLetterType(counts.negativas, currentCarta?.letter_type);
  const currentDocType = mapLetterTypeToDocType(currentCarta?.letter_type);
  const activeDocType = suggestedDocType ?? currentDocType;
  const activeLetterType = mapDocTypeToLetterType(activeDocType);
  const negativeCount = pendingSuggestion?.negativeCount ?? counts.negativas;
  const source = pendingSuggestion?.source ?? 'supabase';
  const matchingCarta = activeLetterType
    ? cartas.find((carta) => carta.status !== 'Anulada' && carta.letter_type === activeLetterType)
    : null;
  const [localCarta, setLocalCarta] = useState<CartaDisciplinaria | null>(null);
  const activeCarta = localCarta ?? matchingCarta ?? (!suggestedDocType ? currentCarta : null);
  const workflowStatus = resolveCartaWorkflowStatus(activeCarta);
  const [showGenerator, setShowGenerator] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshAfterChange = async () => {
    await onRefresh();
  };

  const ensureCarta = async (): Promise<CartaDisciplinaria | null> => {
    if (activeCarta) return activeCarta;
    if (!activeLetterType || !activeDocType) return null;
    const created = await createPendingCartaForStudent({
      student: {
        id: student.id,
        full_name: student.full_name,
        course_id: student.course_id,
        course_name: student.course_name,
      },
      letterType: activeLetterType,
      negativeCount,
      source,
    });
    if (created) setLocalCarta(created);
    return created;
  };

  const runCartaAction = async (action: (carta: CartaDisciplinaria) => Promise<boolean>, successText: string) => {
    setBusy(true);
    setMessage(null);
    const carta = await ensureCarta();
    if (!carta) {
      setBusy(false);
      setMessage('No hay carta requerida para este estudiante.');
      return;
    }
    const ok = await action(carta);
    if (ok) {
      setMessage(successText);
      await refreshAfterChange();
    }
    setBusy(false);
  };

  const handleCreate = async () => {
    setBusy(true);
    setMessage(null);
    const carta = await ensureCarta();
    if (carta) {
      setShowGenerator(true);
      setMessage('Generador abierto.');
      void createCartaEvent(carta.id, 'created', 'Carta abierta en generador desde ficha disciplinaria');
    } else {
      setMessage('No hay carta requerida para este estudiante.');
    }
    setBusy(false);
  };

  const handlePrint = async (carta: CartaDisciplinaria) => {
    const cartaAnnotations = await fetchCartaAnnotations(carta);
    const opened = await printHistoricalCarta(
      carta,
      { full_name: student.full_name, course_name: student.course_name, course_id: student.course_id, rut: student.rut },
      cartaAnnotations
    );
    if (opened) await markCartaPrinted(carta.id);
    return opened;
  };

  const handleDownloadPdf = async (carta: CartaDisciplinaria) => {
    const cartaAnnotations = await fetchCartaAnnotations(carta);
    const downloaded = await downloadHistoricalCartaPdf(
      carta,
      { full_name: student.full_name, course_name: student.course_name, course_id: student.course_id, rut: student.rut },
      cartaAnnotations
    );
    if (downloaded) await markCartaDownloadedPdf(carta.id);
    return downloaded;
  };

  const handleDownloadWord = async (carta: CartaDisciplinaria) => {
    downloadCartaWordFile(carta, student);
    return markCartaDownloadedWord(carta.id);
  };

  const handleManualProcess = async () => {
    const note = window.prompt('Observación del trámite procesado manualmente')?.trim();
    if (!note) return;
    await runCartaAction(
      (carta) => markCartaProcessedManually(carta.id, note),
      'Carta marcada como procesada manualmente.'
    );
  };

  const handleAnnul = async () => {
    if (!activeCarta) return;
    const reason = window.prompt('Motivo de anulación')?.trim();
    if (!reason) return;
    await runCartaAction((carta) => annulCarta(carta.id, reason), 'Carta anulada.');
  };

  const handleGeneratorAction = async (action: 'printed' | 'downloaded_pdf' | 'downloaded_word') => {
    const carta = await ensureCarta();
    if (!carta) return;
    if (action === 'printed') await markCartaPrinted(carta.id);
    if (action === 'downloaded_pdf') await markCartaDownloadedPdf(carta.id);
    if (action === 'downloaded_word') await markCartaDownloadedWord(carta.id);
    await refreshAfterChange();
  };

  const statusLabel = activeCarta ? getCartaWorkflowLabel(activeCarta) : activeLetterType ? 'Carta sugerida' : 'Sin carta requerida';
  const originLabel = source === 'pdf' ? 'nuevo PDF' : 'conteo Supabase';
  const canAct = Boolean(activeDocType && activeLetterType);
  const realized = workflowStatus === 'completed';

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-bold text-neutral-900">Carta sugerida o pendiente</h3>
        </div>
        {activeLetterType ? (
          <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-2">
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-400">Tipo de carta</p>
              <p className="mt-1 font-bold text-neutral-900">{activeLetterType}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-400">Estado del trámite</p>
              <p className="mt-1 font-bold text-neutral-900">{statusLabel}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-400">Motivo</p>
              <p className="mt-1 font-bold text-neutral-900">{negativeCount} negativas detectadas</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-400">Origen de la sugerencia</p>
              <p className="mt-1 font-bold text-neutral-900">{originLabel}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">No hay carta requerida.</div>
        )}
        {activeCarta && (
          <p className="mt-3 text-xs text-neutral-500">
            Registro Supabase: {formatDate(activeCarta.created_at)} · {activeCarta.status}
            {realized ? ' · trámite validado' : ' · trámite pendiente de validación'}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Acciones principales</h3>
            <p className="mt-1 text-xs text-neutral-500">Una carta queda realizada solo con impresión, descarga, registro o procesamiento manual.</p>
          </div>
          {message && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{message}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void handleCreate()} disabled={!canAct || busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            <FileText className="h-4 w-4" />
            Crear carta
          </button>
          <button type="button" onClick={() => void runCartaAction(handlePrint, 'Carta impresa.')} disabled={!canAct || busy} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            <Printer className="h-4 w-4" />
            Imprimir carta
          </button>
          <button type="button" onClick={() => void runCartaAction(handleDownloadPdf, 'Carta descargada en PDF.')} disabled={!canAct || busy} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            <Download className="h-4 w-4" />
            Descargar PDF
          </button>
          <button type="button" onClick={() => void runCartaAction(handleDownloadWord, 'Carta descargada en Word.')} disabled={!canAct || busy} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">
            <Save className="h-4 w-4" />
            Descargar Word
          </button>
          <button type="button" onClick={() => void handleManualProcess()} disabled={!canAct || busy} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
            <CheckCircle2 className="h-4 w-4" />
            Marcar como procesada
          </button>
          <button type="button" onClick={() => void handleAnnul()} disabled={!activeCarta || busy} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            <Ban className="h-4 w-4" />
            Anular
          </button>
        </div>
      </section>

      {showGenerator && activeDocType && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Generador de carta</h3>
              <p className="mt-1 text-xs text-neutral-500">Se abre solo para completar y emitir el documento.</p>
            </div>
            <button type="button" onClick={() => setShowGenerator(false)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" aria-label="Cerrar generador">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
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
              initialDocType={activeDocType}
              existingCartaId={activeCarta?.id || localCarta?.id}
              onLetterAction={handleGeneratorAction}
              onRegistered={() => void refreshAfterChange()}
            />
          </Suspense>
        </section>
      )}
    </div>
  );
}
