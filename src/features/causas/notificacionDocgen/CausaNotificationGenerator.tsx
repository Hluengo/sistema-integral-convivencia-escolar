/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { CheckCircle2, FileSignature, Printer, RotateCcw, Trash2 } from 'lucide-react';
import type { Causa } from '@/src/shared/lib/types';
import { getCurrentDateStr } from '@/src/shared/lib/anotacionesUtils';
import { useAuthStore } from '@/src/shared/lib/stores/authStore';
import { fetchInstitutionDocumentSettings } from '@/src/shared/api/services/institution.service';
import Button from '@/src/shared/ui/Button';
import LetterPreviewViewport from '@/src/features/anotaciones/docgen/LetterPreviewViewport';
import { buildCausaDocumentSnapshot, buildPrefilledNotificationContent } from './builders';
import NotificationForm from './NotificationForm';
import NotificacionContent from './NotificacionContent';
import { NOTIFICACION_TITLE } from './defaultContent';
import type { CausaDocumentSnapshot, CausaDocumentStatus, NotificationContent } from './types';

export interface NotificationFeedback {
  text: string;
  tone: 'info' | 'success' | 'error';
}

interface CausaNotificationGeneratorProps {
  causa: Causa;
  privacyMode: boolean;
  initialSnapshot: CausaDocumentSnapshot | null;
  documentStatus: CausaDocumentStatus | null;
  isProcessing: boolean;
  feedback: NotificationFeedback | null;
  onSaveDraft: (snapshot: CausaDocumentSnapshot) => void | Promise<void>;
  onMarkNotified: (snapshot: CausaDocumentSnapshot) => void | Promise<void>;
  onAnnul: () => void | Promise<void>;
}

/**
 * Editor de la Notificación de Inicio de Indagación (hoja Carta, sin IA).
 *
 * Patrón hermano de AnotacionesDocumentGenerator: plantilla editable en vivo,
 * vista previa con validación visible de desbordamiento, impresión Carta y
 * acciones de trámite. El snapshot guardado permite reabrir y reimprimir el
 * contenido exacto aunque cambien las plantillas base.
 */
export default function CausaNotificationGenerator({
  causa,
  privacyMode,
  initialSnapshot,
  documentStatus,
  isProcessing,
  feedback,
  onSaveDraft,
  onMarkNotified,
  onAnnul,
}: CausaNotificationGeneratorProps) {
  const tenantId = useAuthStore((state) => state.tenantId);
  const institutionQuery = useQuery({
    queryKey: ['institution-settings', tenantId, 'notificacion-preview'],
    queryFn: fetchInstitutionDocumentSettings,
    enabled: Boolean(tenantId),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const { refetch: refetchInstitution } = institutionQuery;
  const logoRetryRef = useRef(false);
  const handleLogoError = useCallback(() => {
    if (logoRetryRef.current) return;
    logoRetryRef.current = true;
    void refetchInstitution();
  }, [refetchInstitution]);

  const [apoderadoName, setApoderadoName] = useState('');
  const [emittedBy, setEmittedBy] = useState('');
  const [content, setContent] = useState<NotificationContent>(() =>
    buildPrefilledNotificationContent(causa),
  );
  const initialAppliedRef = useRef(false);

  useEffect(() => {
    if (initialAppliedRef.current) return;
    if (initialSnapshot) {
      setContent(initialSnapshot.content);
      setApoderadoName(initialSnapshot.apoderadoName);
      setEmittedBy(initialSnapshot.emittedBy);
    }
    initialAppliedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateContent = useCallback((field: keyof NotificationContent, value: string) => {
    setContent((current) => ({ ...current, [field]: value }));
  }, []);

  const resetContent = useCallback(() => {
    setContent(buildPrefilledNotificationContent(causa, initialSnapshot?.content));
  }, [causa, initialSnapshot]);

  const previewRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);

  const dateStr = getCurrentDateStr();

  const currentSnapshot = useMemo(
    () =>
      buildCausaDocumentSnapshot({
        causa,
        privacyMode,
        content,
        apoderadoName,
        emittedBy,
      }),
    [apoderadoName, causa, content, emittedBy, privacyMode],
  );

  const printFileName = useMemo(
    () => `Notificacion_Inicio_Indagacion_${causa.id}_${dateStr}`,
    [causa.id, dateStr],
  );

  const handlePrint = useReactToPrint({
    contentRef: previewRef,
    documentTitle: printFileName,
    ignoreGlobalStyles: false,
    pageStyle: `
      @page {
        size: 216mm 279mm;
        margin: 0;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        width: 216mm;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .letter-document {
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        transform: none !important;
      }
    `,
    onAfterPrint: () => {
      setPrintMessage(
        'Impresión finalizada. Use “Marcar como notificada” para confirmar la entrega y registrar el hito en el expediente.',
      );
    },
    onPrintError: (_location: 'onBeforePrint' | 'print', error: Error) => {
      setPrintMessage(`Error al imprimir: ${error.message}`);
    },
  });

  const handleOverflowChange = useCallback((overflow: boolean) => {
    setHasOverflow(overflow);
  }, []);

  const canEdit = documentStatus === null || documentStatus === 'Pendiente';
  return (
    <div className="space-y-5">
      {printMessage && (
        <div
          role="status"
          className="rounded-xl border border-info-200 bg-info-50 p-4 text-sm text-info-700"
        >
          {printMessage}
        </div>
      )}

      {hasOverflow && (
        <div
          role="alert"
          className="rounded-xl border border-grave-200 bg-grave-50 p-4 text-sm text-grave-700"
        >
          El contenido supera una hoja Carta (216 x 279 mm). Reduzca el texto o revise el documento
          antes de imprimir: el excedente se corta en la impresión.
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-neutral-900">{NOTIFICACION_TITLE}</h4>
            <p className="mt-0.5 text-xs text-neutral-500">
              {documentStatus === 'Notificada'
                ? 'Documento notificado. Puede reimprimir el snapshot guardado.'
                : documentStatus === 'Anulada'
                  ? 'Documento anulado. Cree una nueva notificación si corresponde.'
                  : 'Plantilla editable. Revise los antecedentes del expediente antes de emitir.'}
            </p>
          </div>
          {documentStatus && (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-[10px] text-neutral-600">
              Estado: {documentStatus}
            </span>
          )}
        </div>

        {!canEdit && (
          <div className="rounded-lg border border-info-200 bg-info-50 p-3 text-sm text-info-700">
            Este documento ya fue {documentStatus === 'Notificada' ? 'notificado' : 'anulado'} y no
            admite edición. Se muestra el contenido exacto guardado al momento de la emisión.
          </div>
        )}

        {canEdit && (
          <NotificationForm
            apoderadoName={apoderadoName}
            onApoderadoNameChange={setApoderadoName}
            emittedBy={emittedBy}
            onEmittedByChange={setEmittedBy}
            content={content}
            onContentChange={updateContent}
            onResetContent={resetContent}
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="mx-auto w-full max-w-[216mm] rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Acciones del documento
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="custom"
              onClick={() => handlePrint()}
              className="rounded-xl bg-neutral-700 px-4 py-2.5 font-medium text-white shadow-xs hover:bg-neutral-800"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </Button>

            {canEdit && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => void onSaveDraft(currentSnapshot)}
                  disabled={isProcessing}
                  className="rounded-xl px-4 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileSignature className="h-4 w-4" /> Guardar borrador
                </Button>

                <Button
                  variant="custom"
                  onClick={() => void onMarkNotified(currentSnapshot)}
                  disabled={isProcessing}
                  className="rounded-xl border border-leve-200 bg-leve-50 px-4 py-2.5 font-medium text-leve-700 shadow-xs hover:bg-leve-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isProcessing ? 'Procesando…' : 'Marcar como notificada'}
                </Button>

                {documentStatus === 'Pendiente' && (
                  <Button
                    variant="secondary"
                    onClick={() => void onAnnul()}
                    disabled={isProcessing}
                    className="rounded-xl px-4 py-2.5 font-medium text-danger-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Anular
                  </Button>
                )}
              </>
            )}

            {documentStatus === 'Notificada' && (
              <Button
                variant="secondary"
                onClick={() => handlePrint()}
                className="rounded-xl px-4 py-2.5 font-medium"
              >
                <RotateCcw className="h-4 w-4" /> Reimprimir
              </Button>
            )}
          </div>
          {feedback && (
            <p
              role={feedback.tone === 'error' ? 'alert' : 'status'}
              className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
                feedback.tone === 'error'
                  ? 'bg-gravisima-50 text-gravisima-700'
                  : feedback.tone === 'success'
                    ? 'bg-leve-50 text-leve-700'
                    : 'bg-blue-50 text-blue-700'
              }`}
            >
              {feedback.text}
            </p>
          )}
        </div>

        <LetterPreviewViewport onOverflowChange={handleOverflowChange}>
          <NotificacionContent
            ref={previewRef}
            id="notificacion-preview-letter"
            content={content}
            expediente={currentSnapshot.expediente}
            apoderadoName={apoderadoName}
            emittedBy={emittedBy || 'Dirección de Convivencia Escolar'}
            emissionDate={dateStr}
            logoSrc={institutionQuery.data?.logo_url}
            institutionName={institutionQuery.data?.official_name}
            onLogoError={handleLogoError}
          />
        </LetterPreviewViewport>
      </div>
    </div>
  );
}
