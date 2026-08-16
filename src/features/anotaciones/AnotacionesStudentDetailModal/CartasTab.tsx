/** @license SPDX-License-Identifier: Apache-2.0 */

import { lazy, Suspense, useState } from 'react';
import { Archive, Ban, FileText, XCircle } from 'lucide-react';
import type { Annotation, CartaDisciplinaria } from '@/shared/lib/types';
import { TEACHERS_BY_COURSE } from '@/shared/lib/anotacionesUtils';
import {
  archiveCarta,
  annulCarta,
  createPendingCartaForStudent,
  markCartaProcessedManually,
  resolveCartaWorkflowStatus,
} from '@/shared/api/services/cartas.service';
import {
  getCartaProcessingBlockReason,
  getHighestPriorityLetterType,
  getOutstandingLetterType,
  getPhysicalCartaBaselineType,
  getSuggestedLetterType,
  mapDocTypeToLetterType,
  mapLetterTypeToDocType,
  resolveStudentCartaTableState,
  type LetterDocType,
} from '@/shared/lib/domain/disciplinaryStage';
import type { StudentInfo } from './constants';
import PhysicalCartaRegistrationCard from './PhysicalCartaRegistrationCard';
import TextInputDialog from '@/shared/ui/TextInputDialog';
import Button from '@/shared/ui/Button';
import { DocumentGeneratorSkeleton } from '@/shared/Skeleton';
import { useAuthStore } from '@/shared/lib/stores/authStore';
import { useInvalidateDashboardQueries } from '@/shared/lib/hooks/useInvalidateDashboardQueries';

const AnotacionesDocumentGenerator = lazy(() => import('../AnotacionesDocumentGenerator'));

type FeedbackTone = 'info' | 'success' | 'error';

interface PendingCartaSuggestion {
  docType: LetterDocType;
  negativeCount: number;
  source: 'pdf' | 'supabase';
}

interface PendingManualProcess {
  contentSnapshot: Record<string, unknown>;
  selectedDocType: LetterDocType;
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
  const tenantId = useAuthStore((state) => state.tenantId);
  const sessionUser = useAuthStore((state) => state.user);
  const invalidateDashboard = useInvalidateDashboardQueries();
  const actor = sessionUser ? { userId: sessionUser.id, email: sessionUser.email ?? null } : null;
  const schoolYear = Number(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
    }).format(new Date()),
  );
  const platformCurrentCarta =
    cartas.find((carta) => carta.status !== 'Anulada' && carta.origin !== 'physical') ?? null;
  const physicalBaselineType = getPhysicalCartaBaselineType(cartas, schoolYear);
  const cartaState = resolveStudentCartaTableState(cartas, schoolYear);
  const countSuggestedDocType = getSuggestedLetterType(
    counts.negativas,
    cartaState.completedLetterType,
  );
  const requiredDocType = getHighestPriorityLetterType(
    pendingSuggestion?.docType,
    countSuggestedDocType,
  );
  const suggestedDocType = getOutstandingLetterType(
    cartaState.completedLetterType,
    requiredDocType,
  );
  const currentDocType = mapLetterTypeToDocType(cartaState.currentLetterType);
  const physicalCurrentDocType = mapLetterTypeToDocType(physicalBaselineType);
  const activeDocType = suggestedDocType ?? currentDocType ?? physicalCurrentDocType;
  const activeLetterType = mapDocTypeToLetterType(activeDocType);
  const negativeCount = pendingSuggestion?.negativeCount ?? counts.negativas;
  const source = pendingSuggestion?.source ?? 'supabase';
  const matchingCarta = activeLetterType
    ? cartas.find((carta) => carta.status !== 'Anulada' && carta.letter_type === activeLetterType)
    : null;
  const [localCarta, setLocalCarta] = useState<CartaDisciplinaria | null>(null);
  const activeCarta =
    localCarta ?? matchingCarta ?? (!suggestedDocType ? platformCurrentCarta : null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<FeedbackTone>('info');
  const [pendingManualProcess, setPendingManualProcess] = useState<PendingManualProcess | null>(
    null,
  );
  const [isAnnulDialogOpen, setIsAnnulDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const refreshAfterChange = async () => {
    await Promise.all([onRefresh(), invalidateDashboard()]);
  };

  const ensureCarta = async (
    requestedDocType: LetterDocType | null = activeDocType,
  ): Promise<CartaDisciplinaria | null> => {
    const requestedLetterType = mapDocTypeToLetterType(requestedDocType);
    if (!requestedLetterType || !requestedDocType) return null;

    if (
      localCarta &&
      localCarta.status !== 'Anulada' &&
      localCarta.origin !== 'physical' &&
      localCarta.letter_type === requestedLetterType
    ) {
      return localCarta;
    }

    const existingCarta = cartas.find(
      (carta) =>
        carta.status !== 'Anulada' &&
        carta.origin !== 'physical' &&
        carta.letter_type === requestedLetterType,
    );
    if (existingCarta) return existingCarta;

    const created = await createPendingCartaForStudent({
      student: {
        id: student.id,
        full_name: student.full_name,
        course_id: student.course_id,
        course_name: student.course_name,
      },
      letterType: requestedLetterType,
      negativeCount,
      source,
      tenantId: tenantId ?? null,
    });
    if (created) setLocalCarta(created);
    return created;
  };

  const runCartaAction = async (
    action: (carta: CartaDisciplinaria) => Promise<boolean>,
    successText: string,
    requestedDocType: LetterDocType | null = activeDocType,
  ) => {
    setBusy(true);
    setMessage(null);
    const carta = await ensureCarta(requestedDocType);
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
    setMessage(null);
    const blockReason = getCartaProcessingBlockReason(
      selectedDocType,
      activeDocType,
      counts.negativas,
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
    setPendingManualProcess({ contentSnapshot, selectedDocType });
  };

  const confirmManualProcess = async (note: string) => {
    if (!pendingManualProcess) return;
    const { contentSnapshot, selectedDocType } = pendingManualProcess;
    setPendingManualProcess(null);
    await runCartaAction(
      (carta) => markCartaProcessedManually(carta.id, note, contentSnapshot, actor),
      'Carta marcada como procesada.',
      selectedDocType,
    );
  };

  const handleAnnul = () => {
    if (!activeCarta) return;
    setIsAnnulDialogOpen(true);
  };

  const handleArchive = () => {
    if (!activeCarta) return;
    setIsArchiveDialogOpen(true);
  };

  const confirmAnnul = async (reason: string) => {
    setIsAnnulDialogOpen(false);
    await runCartaAction((carta) => annulCarta(carta.id, reason, actor), 'Carta anulada.');
  };

  const confirmArchive = async (note: string) => {
    setIsArchiveDialogOpen(false);
    await runCartaAction((carta) => archiveCarta(carta.id, note, actor), 'Carta archivada.');
  };

  const canAct = Boolean(activeDocType && activeLetterType);
  const canArchive =
    Boolean(activeCarta) &&
    activeCarta?.origin !== 'physical' &&
    resolveCartaWorkflowStatus(activeCarta) === 'completed';

  return (
    <div className="space-y-5">
      <PhysicalCartaRegistrationCard
        key={student.id}
        studentId={student.id}
        cartas={cartas}
        negativeCount={counts.negativas}
        onRegistered={onRefresh}
      />

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
                  ? 'bg-gravisima-50 text-gravisima-700'
                  : messageTone === 'success'
                    ? 'bg-leve-50 text-leve-700'
                    : 'bg-blue-50 text-blue-700'
              }`}
            >
              {message}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void handleCreate()}
            disabled={!canAct || busy}
            className="rounded-xl px-4 py-2"
          >
            <FileText className="h-4 w-4" />
            Crear carta
          </Button>
          <Button
            variant="custom"
            onClick={handleAnnul}
            disabled={!activeCarta || busy}
            className="rounded-xl border border-gravisima-300 bg-gravisima-50 px-4 py-2 text-gravisima-700 shadow-sm hover:bg-gravisima-100 hover:text-gravisima-800 disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            <Ban className="h-4 w-4" />
            Anular
          </Button>
          <Button
            variant="custom"
            onClick={handleArchive}
            disabled={!canArchive || busy}
            className="rounded-xl border border-leve-300 bg-leve-50 px-4 py-2 text-leve-800 shadow-sm hover:bg-leve-100 hover:text-leve-900 disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            <Archive className="h-4 w-4" />
            Archivar
          </Button>
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
          <Suspense fallback={<DocumentGeneratorSkeleton />}>
            <AnotacionesDocumentGenerator
              key={`${student.id}:${activeDocType}:${activeCarta?.id ?? 'new'}`}
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
              processingFeedback={message ? { text: message, tone: messageTone } : null}
            />
          </Suspense>
        </section>
      )}

      <TextInputDialog
        open={pendingManualProcess !== null}
        title="Confirmar procesamiento de carta"
        description="Registre qué se realizó y cuándo. Este texto no cambia el tipo de carta."
        label="Observación de cierre"
        placeholder="Ej.: Carta impresa y entregada al apoderado el 28-07-2026."
        confirmLabel="Marcar como procesada"
        onCancel={() => setPendingManualProcess(null)}
        onConfirm={(note) => void confirmManualProcess(note)}
      />

      <TextInputDialog
        open={isAnnulDialogOpen}
        title="Anular carta"
        description="La carta permanecerá en el historial con estado anulado y no se considerará vigente."
        label="Motivo de anulación"
        placeholder="Describa por qué se anula esta carta."
        confirmLabel="Anular carta"
        destructive
        onCancel={() => setIsAnnulDialogOpen(false)}
        onConfirm={(reason) => void confirmAnnul(reason)}
      />

      <TextInputDialog
        open={isArchiveDialogOpen}
        title="Archivar carta"
        description="Confirme que la carta fue impresa, revisada en entrevista con apoderado/a, firmada y archivada en expediente físico."
        label="Observación de archivo"
        placeholder="Ej.: Carta firmada por apoderado/a el 03-08-2026 y archivada en hoja de vida."
        confirmLabel="Archivar carta"
        onCancel={() => setIsArchiveDialogOpen(false)}
        onConfirm={(note) => void confirmArchive(note)}
      />
    </div>
  );
}
