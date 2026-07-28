/** @license SPDX-License-Identifier: Apache-2.0 */

import { lazy, Suspense, useState } from 'react';
import { Ban, FileText, XCircle } from 'lucide-react';
import type { Annotation, CartaDisciplinaria } from '@/src/shared/lib/types';
import { TEACHERS_BY_COURSE } from '@/src/lib/anotacionesUtils';
import {
  annulCarta,
  createPendingCartaForStudent,
  getCartaWorkflowLabel,
  markCartaProcessedManually,
  resolveCartaWorkflowStatus,
} from '@/src/services/cartas.service';
import {
  getCartaProcessingBlockReason,
  getHighestPriorityLetterType,
  getNextLetterAfterPhysicalCarta,
  getPhysicalCartaBaselineType,
  getSuggestedLetterType,
  mapDocTypeToLetterType,
  mapLetterTypeToDocType,
  type LetterDocType,
} from '@/src/shared/lib/domain/disciplinaryStage';
import { formatDate, type StudentInfo } from './constants';
import PhysicalCartaRegistrationCard from './PhysicalCartaRegistrationCard';

const AnotacionesDocumentGenerator = lazy(() => import('../AnotacionesDocumentGenerator'));

type FeedbackTone = 'info' | 'success' | 'error';

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
  pendingSuggestion?: PendingCartaSuggestion | null;
  privacyMode: boolean;
  teachers?: Record<string, string>;
  onRefresh: () => void | Promise<void>;
}

export default function CartasTab({
  student,
  annotations,
  cartas,
  counts,
  pendingSuggestion,
  privacyMode,
  teachers = TEACHERS_BY_COURSE,
  onRefresh,
}: CartasTabProps) {
  const schoolYear = Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
    }).format(new Date()),
  );
  const platformCurrentCarta =
    cartas.find((carta) => carta.status !== 'Anulada' && carta.origin !== 'physical') ?? null;
  const physicalBaselineType = getPhysicalCartaBaselineType(cartas, schoolYear);
  const physicalSuggestedDocType = getNextLetterAfterPhysicalCarta(physicalBaselineType);
  const countSuggestedDocType = getSuggestedLetterType(
    counts.negativas,
    platformCurrentCarta?.letter_type,
  );
  const nonPhysicalSuggestedDocType = getHighestPriorityLetterType(
    pendingSuggestion?.docType,
    countSuggestedDocType,
  );
  const suggestedDocType = getHighestPriorityLetterType(
    physicalSuggestedDocType,
    nonPhysicalSuggestedDocType,
  );
  const currentDocType = mapLetterTypeToDocType(platformCurrentCarta?.letter_type);
  const activeDocType = suggestedDocType ?? currentDocType;
  const activeLetterType = mapDocTypeToLetterType(activeDocType);
  const negativeCount = pendingSuggestion?.negativeCount ?? counts.negativas;
  const usesPhysicalProgression =
    Boolean(physicalSuggestedDocType) &&
    activeDocType === physicalSuggestedDocType &&
    nonPhysicalSuggestedDocType !== activeDocType;
  const source = pendingSuggestion?.source ?? (usesPhysicalProgression ? 'physical' : 'supabase');
  const matchingCarta = activeLetterType
    ? cartas.find(
        (carta) =>
          carta.status !== 'Anulada' &&
          carta.origin !== 'physical' &&
          carta.letter_type === activeLetterType,
      )
    : null;
  const [localCarta, setLocalCarta] = useState<CartaDisciplinaria | null>(null);
  const activeCarta =
    localCarta ?? matchingCarta ?? (!suggestedDocType ? platformCurrentCarta : null);
  const workflowStatus = resolveCartaWorkflowStatus(activeCarta);
  const [showGenerator, setShowGenerator] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<FeedbackTone>('info');

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

  const runCartaAction = async (
    action: (carta: CartaDisciplinaria) => Promise<boolean>,
    successText: string,
  ) => {
    setBusy(true);
    setMessage(null);
    const carta = await ensureCarta();
    if (!carta) {
      setBusy(false);
      setMessageTone('error');
      setMessage('No hay carta requerida para este estudiante.');
      return;
    }
    const ok = await action(carta);
    if (ok) {
      setMessageTone('success');
      setMessage(successText);
      setLocalCarta(null);
      await refreshAfterChange();
    } else {
      setMessageTone('error');
      setMessage('No se pudo completar la acción. Inténtelo nuevamente.');
    }
    setBusy(false);
  };

  const handleCreate = async () => {
    setBusy(true);
    setMessage(null);
    const carta = await ensureCarta();
    if (carta) {
      setShowGenerator(true);
      setMessageTone('info');
      setMessage('Generador abierto.');
    } else {
      setMessageTone('error');
      setMessage('No hay carta requerida para este estudiante.');
    }
    setBusy(false);
  };

  const handleManualProcess = async (
    contentSnapshot: Record<string, unknown>,
    selectedDocType: LetterDocType,
  ) => {
    const blockReason = getCartaProcessingBlockReason(
      selectedDocType,
      activeDocType,
      counts.negativas,
      {
        allowDerivacionFromPhysicalCompromiso:
          physicalBaselineType === 'Carta de Compromiso Conductual',
      },
    );
    if (blockReason === 'derivacion_requires_15_registered') {
      setMessageTone('error');
      setMessage(
        `No se puede procesar la derivación: Supabase registra ${counts.negativas} negativas. Confirme primero la anotación número 15 en “Revisar PDF”.`,
      );
      return;
    }
    if (blockReason === 'letter_type_mismatch') {
      setMessageTone('error');
      setMessage(
        `El documento seleccionado no coincide con la etapa registrada. Seleccione “${activeLetterType}” o confirme primero la actualización de anotaciones.`,
      );
      return;
    }
    const note = window
      .prompt(
        'Observación de cierre del trámite. Describa qué se realizó y cuándo. Ejemplo: “Carta impresa y entregada al apoderado el 28-07-2026”. Este texto no cambia el tipo de carta.',
      )
      ?.trim();
    if (!note) return;
    await runCartaAction(
      (carta) => markCartaProcessedManually(carta.id, note, contentSnapshot),
      'Carta marcada como procesada.',
    );
  };

  const handleAnnul = async () => {
    if (!activeCarta) return;
    const reason = window.prompt('Motivo de anulación')?.trim();
    if (!reason) return;
    await runCartaAction((carta) => annulCarta(carta.id, reason), 'Carta anulada.');
  };

  const statusLabel = activeCarta
    ? getCartaWorkflowLabel(activeCarta)
    : activeLetterType
      ? 'Carta sugerida'
      : 'Sin carta requerida';
  const originLabel = pendingSuggestion
    ? 'nuevo PDF'
    : usesPhysicalProgression
      ? 'carta física existente'
      : 'conteo Supabase';
  const canAct = Boolean(activeDocType && activeLetterType);
  const realized = workflowStatus === 'completed';

  return (
    <div className="space-y-5">
      <PhysicalCartaRegistrationCard
        key={student.id}
        studentId={student.id}
        cartas={cartas}
        onRegistered={onRefresh}
      />

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
              <p className="mt-1 font-bold text-neutral-900">
                {usesPhysicalProgression
                  ? `Progresión habilitada por ${physicalBaselineType}`
                  : `${negativeCount} negativas detectadas`}
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-400">Origen de la sugerencia</p>
              <p className="mt-1 font-bold text-neutral-900">{originLabel}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
            No hay carta requerida.
          </div>
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
            <p className="mt-1 text-xs text-neutral-500">
              Abre el generador para editar e imprimir la plantilla. Luego confirma el trámite
              mediante “Marcar como procesada”.
            </p>
          </div>
          {message && (
            <span
              role={messageTone === 'error' ? 'alert' : 'status'}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                messageTone === 'error'
                  ? 'bg-red-50 text-red-700'
                  : messageTone === 'success'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-blue-50 text-blue-700'
              }`}
            >
              {message}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!canAct || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Crear carta
          </button>
          <button
            type="button"
            onClick={() => void handleAnnul()}
            disabled={!activeCarta || busy}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
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
              <p className="mt-1 text-xs text-neutral-500">
                Edita la carta en la aplicación y luego imprime o genera PDF desde la plantilla
                visible.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGenerator(false)}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Cerrar generador"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <Suspense
            fallback={
              <div className="py-10 text-center text-sm text-neutral-500">
                Cargando generador...
              </div>
            }
          >
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
              initialContentSnapshot={
                activeCarta?.content_snapshot || localCarta?.content_snapshot || null
              }
              onMarkProcessed={handleManualProcess}
              isProcessing={busy}
            />
          </Suspense>
        </section>
      )}
    </div>
  );
}
