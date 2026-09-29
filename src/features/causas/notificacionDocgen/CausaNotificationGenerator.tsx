/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactToPrint } from "react-to-print";
import { CARTA_PAGE_STYLE } from "@/shared/ui/printStyles";
import {
  CheckCircle2,
  FileSignature,
  Printer,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { supabase } from "@/shared/api/lib/supabase";
import type { Causa } from "@/shared/lib/types";
import { getCurrentDateStr } from "@/shared/lib/anotacionesUtils";
import { useAuthStore } from "@/shared/lib/stores/authStore";
import { fetchInstitutionDocumentSettings } from "@/shared/api/services/institution.service";
import Button from "@/shared/ui/Button";
import LetterPreviewViewport from "@/src/features/anotaciones/docgen/LetterPreviewViewport";
import {
  buildCausaDocumentSnapshot,
  buildPrefilledNotificationContent,
  getNotificacionResponsable,
  isValidApoderadoEmail,
} from "./builders";
import NotificationForm from "./NotificationForm";
import NotificacionContent from "./NotificacionContent";
import { NOTIFICACION_TITLE } from "./defaultContent";
import type {
  CausaDocumentSnapshot,
  CausaDocumentStatus,
  NotificationContent,
} from "./types";

export interface NotificationFeedback {
  text: string;
  tone: "info" | "success" | "error";
}

interface CausaNotificationGeneratorProps {
  causa: Causa;
  compact?: boolean;
  privacyMode: boolean;
  initialSnapshot: CausaDocumentSnapshot | null;
  documentStatus: CausaDocumentStatus | null;
  isProcessing: boolean;
  feedback: NotificationFeedback | null;
  onSaveDraft: (snapshot: CausaDocumentSnapshot) => void | Promise<void>;
  onMarkNotified: (snapshot: CausaDocumentSnapshot) => void | Promise<void>;
  onSaveApoderadoEmail: (email: string) => void | Promise<void>;
  onAnnul: () => void | Promise<void>;
}

const MAX_EMAIL_HTML_BYTES = 100_000;

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
  compact = false,
  privacyMode,
  initialSnapshot,
  documentStatus,
  isProcessing,
  feedback,
  onSaveDraft,
  onMarkNotified,
  onSaveApoderadoEmail,
  onAnnul,
}: CausaNotificationGeneratorProps) {
  const tenantId = useAuthStore((state) => state.tenantId);
  const institutionQuery = useQuery({
    queryKey: ["institution-settings", tenantId, "notificacion-preview"],
    queryFn: fetchInstitutionDocumentSettings,
    enabled: Boolean(tenantId),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const { refetch: refetchInstitution } = institutionQuery;
  const logoRetryRef = useRef(false);
  const handleLogoError = useCallback(() => {
    if (logoRetryRef.current) return;
    logoRetryRef.current = true;
    void refetchInstitution();
  }, [refetchInstitution]);

  const [apoderadoName, setApoderadoName] = useState(
    initialSnapshot?.apoderadoName ?? "",
  );
  const [apoderadoEmail, setApoderadoEmail] = useState(
    causa.apoderadoEmail ?? "",
  );
  const [emittedBy, setEmittedBy] = useState(
    initialSnapshot?.emittedBy || getNotificacionResponsable(causa),
  );
  const [isSending, setIsSending] = useState(false);
  const [content, setContent] = useState<NotificationContent>(() =>
    buildPrefilledNotificationContent(causa),
  );
  const initialAppliedRef = useRef(false);

  useEffect(() => {
    if (initialAppliedRef.current) return;
    if (initialSnapshot) {
      setContent(
        documentStatus === "Pendiente"
          ? buildPrefilledNotificationContent(causa, initialSnapshot.content)
          : initialSnapshot.content,
      );
      setApoderadoName(initialSnapshot.apoderadoName);
      setEmittedBy(initialSnapshot.emittedBy);
    }
    initialAppliedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateContent = useCallback(
    (field: keyof NotificationContent, value: string) => {
      setContent((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const resetContent = useCallback(() => {
    setContent(
      buildPrefilledNotificationContent(causa, initialSnapshot?.content),
    );
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
    pageStyle: CARTA_PAGE_STYLE,
    onAfterPrint: () => {
      setPrintMessage(
        "Impresión finalizada. Use “Marcar como notificada” para confirmar la entrega y registrar el hito en el expediente.",
      );
    },
    onPrintError: (_location: "onBeforePrint" | "print", error: Error) => {
      setPrintMessage(`Error al imprimir: ${error.message}`);
    },
  });

  const handleOverflowChange = useCallback((overflow: boolean) => {
    setHasOverflow(overflow);
  }, []);

  const handleSendEmail = useCallback(async () => {
    const to = apoderadoEmail.trim();
    if (!isValidApoderadoEmail(to)) {
      setPrintMessage("Ingrese un correo de apoderado válido antes de enviar.");
      return;
    }
    if (hasOverflow) {
      setPrintMessage(
        "El contenido supera una hoja Carta. Redúzcalo antes de enviar por correo.",
      );
      return;
    }
    const documentHtml = previewRef.current?.innerHTML ?? "";
    const html = `${
      '<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #111827; margin-bottom: 24px;">' +
      "<p>Estimado/a apoderado/a:</p>" +
      "<p>Junto con saludarle, nos comunicamos con usted para informarle formalmente el inicio de un proceso de indagación respecto de la situación registrada en el expediente. La notificación oficial se incluye a continuación, con el detalle de los hechos y el marco normativo aplicable.</p>" +
      "<p>Con el propósito de resguardar el debido proceso y asegurar el derecho a ser escuchado y participar activamente en esta instancia formativa, es necesario realizar una entrevista en conjunto.</p>" +
      "<p>Le solicitamos responder a este correo indicando sus horarios de preferencia durante la semana, para agendar el encuentro de la manera más cómoda para usted.</p>" +
      "<p>Agradecemos desde ya su valiosa colaboración y compromiso con la formación de su hijo/a.</p>" +
      "<p>Atentamente,</p>" +
      "<p><strong>Coordinación de Convivencia Escolar</strong><br/><strong>" +
      (institutionQuery.data?.official_name ?? "Establecimiento") +
      "</strong></p>" +
      "</div>"
    }${documentHtml}`;
    if (!documentHtml || new Blob([html]).size > MAX_EMAIL_HTML_BYTES) {
      setPrintMessage("El documento no pudo prepararse para el envío.");
      return;
    }
    setIsSending(true);
    setPrintMessage(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch("/api/notificaciones/documento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          causaId: causa.id,
          to,
          subject: `Notificación de inicio de proceso de indagación y coordinación de entrevista - ${currentSnapshot.studentName}`,
          html,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !payload?.success) {
        setPrintMessage(payload?.error ?? "No fue posible enviar el correo.");
        return;
      }
      await onSaveApoderadoEmail(to);
      setPrintMessage("Correo enviado. Marcando como notificada…");
      await onMarkNotified(currentSnapshot);
    } catch (error) {
      setPrintMessage(
        `Error al enviar: ${error instanceof Error ? error.message : "desconocido"}`,
      );
    } finally {
      setIsSending(false);
    }
  }, [
    apoderadoEmail,
    causa.id,
    currentSnapshot,
    hasOverflow,
    institutionQuery.data?.official_name,
    onMarkNotified,
    onSaveApoderadoEmail,
  ]);

  const canEdit = documentStatus === null || documentStatus === "Pendiente";
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
          El contenido supera una hoja Carta (216 x 279 mm). Reduzca el texto o
          revise el documento antes de imprimir: el excedente se corta en la
          impresión.
        </div>
      )}

      {!compact && (
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-neutral-900">
                {NOTIFICACION_TITLE}
              </h4>
              <p className="mt-0.5 text-xs text-neutral-500">
                {documentStatus === "Notificada"
                  ? "Documento notificado. Puede reimprimir el snapshot guardado."
                  : documentStatus === "Anulada"
                    ? "Documento anulado. Cree una nueva notificación si corresponde."
                    : "Plantilla editable. Revise los antecedentes del expediente antes de emitir."}
              </p>
            </div>
            {documentStatus && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-semibold text-10px text-neutral-600">
                Estado: {documentStatus}
              </span>
            )}
          </div>

          {!canEdit && (
            <div className="rounded-lg border border-info-200 bg-info-50 p-3 text-sm text-info-700">
              Este documento ya fue{" "}
              {documentStatus === "Notificada" ? "notificado" : "anulado"} y no
              admite edición. Se muestra el contenido exacto guardado al momento
              de la emisión.
            </div>
          )}

          {!compact && canEdit && (
            <NotificationForm
              apoderadoName={apoderadoName}
              onApoderadoNameChange={setApoderadoName}
              apoderadoEmail={apoderadoEmail}
              onApoderadoEmailChange={setApoderadoEmail}
              emittedBy={emittedBy}
              onEmittedByChange={setEmittedBy}
              content={content}
              onContentChange={updateContent}
              onResetContent={resetContent}
            />
          )}
        </div>
      )}

      <div className="space-y-4">
        {compact && canEdit && (
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 sm:grid-cols-2">
            <div>
              <label
                htmlFor="notificacion-apoderado-compact"
                className="mb-1 block text-[10px] font-medium text-neutral-700"
              >
                Nombre del Apoderado/a
              </label>
              <input
                id="notificacion-apoderado-compact"
                aria-label="Nombre del apoderado o adulto responsable"
                type="text"
                value={apoderadoName}
                onChange={(event) => setApoderadoName(event.target.value)}
                placeholder="Ingrese el nombre del apoderado/a"
                className="min-h-9 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="notificacion-emitido-por-compact"
                className="mb-1 block text-[10px] font-medium text-neutral-700"
              >
                Encargado/a de indagación
              </label>
              <input
                id="notificacion-emitido-por-compact"
                aria-label="Encargado de indagación que emite"
                type="text"
                value={emittedBy}
                onChange={(event) => setEmittedBy(event.target.value)}
                placeholder="Nombre de quien emite"
                className="min-h-9 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 sm:col-span-2">
              <Button
                variant="secondary"
                onClick={() => void onSaveDraft(currentSnapshot)}
                disabled={isProcessing}
                className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSignature className="mr-1 inline size-3" /> Guardar
                borrador
              </Button>
              <Button
                variant="custom"
                onClick={() => void onMarkNotified(currentSnapshot)}
                disabled={isProcessing}
                className="rounded-md border border-leve-200 bg-leve-50 px-2.5 py-1.5 text-[10px] font-semibold text-leve-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="mr-1 inline size-3" />
                {isProcessing ? "Procesando…" : "Marcar como notificada"}
              </Button>
            </div>
            {feedback && (
              <p
                role={feedback.tone === "error" ? "alert" : "status"}
                className="text-[10px] font-medium text-neutral-600 sm:col-span-2"
              >
                {feedback.text}
              </p>
            )}
          </div>
        )}
        {compact && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                Foliación Digital Inmutable
              </span>
              <span className="text-neutral-500">
                • Auditado Mineduc Ley 19.979
              </span>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="custom"
                onClick={() => handlePrint()}
                className="rounded-md bg-neutral-800 px-2.5 py-1.5 text-[10px] font-semibold text-white"
              >
                <Printer className="mr-1 inline size-3" /> Imprimir
              </Button>
              {documentStatus === "Notificada" && (
                <Button
                  variant="secondary"
                  onClick={() => handlePrint()}
                  className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold"
                >
                  Reimprimir
                </Button>
              )}
            </div>
          </div>
        )}
        {!compact && (
          <div className="mx-auto w-full max-w-[216mm] rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
            <p className="mb-3 font-semibold text-neutral-700 text-xs">
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
                    {isProcessing ? "Procesando…" : "Marcar como notificada"}
                  </Button>

                  <Button
                    variant="custom"
                    onClick={() => void handleSendEmail()}
                    disabled={
                      isProcessing ||
                      isSending ||
                      !isValidApoderadoEmail(apoderadoEmail)
                    }
                    title={
                      isValidApoderadoEmail(apoderadoEmail)
                        ? "Enviar por correo y marcar como notificada"
                        : "Ingrese un correo de apoderado válido para enviar"
                    }
                    className="rounded-xl bg-brand-600 px-4 py-2.5 font-medium text-white shadow-xs hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {isSending ? "Enviando…" : "Enviar por correo"}
                  </Button>

                  {documentStatus === "Pendiente" && (
                    <Button
                      variant="secondary"
                      onClick={() => void onAnnul()}
                      disabled={isProcessing}
                      className="rounded-xl px-4 py-2.5 font-medium text-gravisima-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Anular
                    </Button>
                  )}
                </>
              )}

              {documentStatus === "Notificada" && (
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
                role={feedback.tone === "error" ? "alert" : "status"}
                className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  feedback.tone === "error"
                    ? "bg-gravisima-50 text-gravisima-700"
                    : feedback.tone === "success"
                      ? "bg-leve-50 text-leve-700"
                      : "bg-blue-50 text-blue-700"
                }`}
              >
                {feedback.text}
              </p>
            )}
          </div>
        )}

        <LetterPreviewViewport onOverflowChange={handleOverflowChange}>
          <NotificacionContent
            ref={previewRef}
            id="notificacion-preview-letter"
            content={content}
            expediente={currentSnapshot.expediente}
            apoderadoName={apoderadoName}
            emittedBy={emittedBy || "Dirección de Convivencia Escolar"}
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
