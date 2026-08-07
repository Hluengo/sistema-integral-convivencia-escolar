/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Causa } from '@/shared/lib/types';
import { useTimelineContext } from '@/shared/lib/useTimelineContext';
import {
  annulCausaDocument,
  createPendingCausaDocument,
  fetchCausaDocuments,
  markCausaDocumentNotified,
  saveCausaDocumentSnapshot,
  type CausaDocumentRow,
} from '@/shared/api/services/causaDocuments.service';
import { nowDateOnly } from '@/shared/lib/dateUtils';
import {
  buildNotificacionBitacoraEntry,
  buildNotificacionHito,
  parseCausaDocumentSnapshot,
} from './builders';
import CausaNotificationGenerator, {
  type NotificationFeedback,
} from './CausaNotificationGenerator';
import type { CausaDocumentSnapshot } from './types';

interface CausaNotificationPanelProps {
  causa: Causa;
}

/**
 * Punto único de integración de la Notificación de Inicio de Indagación en el
 * hito chk_rec_3 (Recepción). Administra el ciclo de vida del documento:
 * carga del snapshot persistido, borrador, marcado como notificada (RPC
 * transaccional) y anulación, manteniendo sincronizado el estado local de la
 * causa para que el autoguardado persista el hito y la bitácora.
 */
export default function CausaNotificationPanel({ causa }: CausaNotificationPanelProps) {
  const { privacyMode, currentRole, onUpdateCausa } = useTimelineContext();

  const [documents, setDocuments] = useState<CausaDocumentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<NotificationFeedback | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchCausaDocuments(causa.id).then((rows) => {
      if (cancelled) return;
      setDocuments(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [causa.id]);

  const activeDocument = useMemo(() => {
    const notAnnulled = documents.find((doc) => doc.status !== 'Anulada');
    return notAnnulled ?? documents[0] ?? null;
  }, [documents]);

  const initialSnapshot = useMemo(() => {
    if (!activeDocument?.content_snapshot) return null;
    return parseCausaDocumentSnapshot(activeDocument.content_snapshot);
  }, [activeDocument]);

  const setFeedbackTone = useCallback((text: string, tone: NotificationFeedback['tone']) => {
    setFeedback({ text, tone });
  }, []);

  /** Asegura un documento Pendiente: crea uno nuevo si no existe. */
  const ensurePendingDocument = useCallback(
    async (snapshot: CausaDocumentSnapshot): Promise<CausaDocumentRow | null> => {
      const pending = documents.find((doc) => doc.status === 'Pendiente');
      if (pending) return pending;
      const created = await createPendingCausaDocument(causa, snapshot);
      if (created) {
        setDocuments((current) => [created, ...current]);
        return created;
      }
      return null;
    },
    [causa, documents],
  );

  const handleSaveDraft = useCallback(
    async (snapshot: CausaDocumentSnapshot) => {
      setIsProcessing(true);
      setFeedback(null);
      try {
        const document = await ensurePendingDocument(snapshot);
        if (!document) {
          setFeedbackTone(
            'No se pudo guardar el borrador. Verifique su sesión e intente nuevamente.',
            'error',
          );
          return;
        }
        const saved = await saveCausaDocumentSnapshot(document.id, snapshot);
        if (!saved) {
          setFeedbackTone(
            'No se pudo guardar el borrador. Verifique su sesión e intente nuevamente.',
            'error',
          );
          return;
        }
        setFeedbackTone(
          'Borrador guardado. Puede imprimirlo y marcarlo como notificada cuando corresponda.',
          'success',
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [ensurePendingDocument, setFeedbackTone],
  );

  const handleMarkNotified = useCallback(
    async (snapshot: CausaDocumentSnapshot) => {
      setIsProcessing(true);
      setFeedback(null);
      try {
        const document = await ensurePendingDocument(snapshot);
        if (!document) {
          setFeedbackTone(
            'No se pudo iniciar el trámite. Verifique su sesión e intente nuevamente.',
            'error',
          );
          return;
        }

        const hito = buildNotificacionHito(causa, snapshot);
        const entry = buildNotificacionBitacoraEntry(causa, snapshot, privacyMode);
        const result = await markCausaDocumentNotified(document.id, snapshot, hito, entry);

        if (!result.ok) {
          setFeedbackTone(result.error || 'No se pudo marcar como notificada.', 'error');
          return;
        }

        // Sincroniza el estado local para que el autoguardado persista el
        // hito y la bitácora; el RPC ya los registró de forma atómica.
        onUpdateCausa({
          ...causa,
          checklistDebidoProceso: causa.checklistDebidoProceso.map((item) =>
            item.id === hito.id ? hito : item,
          ),
          bitacora: [entry, ...causa.bitacora],
          fechaUltimaActualizacion: nowDateOnly(),
        });

        setDocuments((current) =>
          current.map((doc) =>
            doc.id === document.id
              ? {
                  ...doc,
                  status: 'Notificada',
                  content_snapshot: snapshot as unknown as Record<string, unknown>,
                  notified_at: new Date().toISOString(),
                }
              : doc,
          ),
        );
        setFeedbackTone(
          'Notificación marcada como notificada. Se registró el hito chk_rec_3 y la entrada de bitácora en el expediente.',
          'success',
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [causa, ensurePendingDocument, onUpdateCausa, privacyMode, setFeedbackTone],
  );

  const handleAnnul = useCallback(async () => {
    if (!activeDocument || activeDocument.status !== 'Pendiente') return;
    setIsProcessing(true);
    setFeedback(null);
    try {
      const annulled = await annulCausaDocument(activeDocument.id);
      if (!annulled) {
        setFeedbackTone(
          'No se pudo anular la notificación. Verifique su sesión e intente nuevamente.',
          'error',
        );
        return;
      }
      setDocuments((current) =>
        current.map((doc) => (doc.id === activeDocument.id ? { ...doc, status: 'Anulada' } : doc)),
      );
      setFeedbackTone('Notificación anulada. Puede generar una nueva si corresponde.', 'info');
    } finally {
      setIsProcessing(false);
    }
  }, [activeDocument, setFeedbackTone]);

  if (currentRole === 'docente') {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
        El registro y emisión de la Notificación de Inicio de Indagación lo realiza el equipo de
        convivencia o inspectoría.
      </div>
    );
  }

  return (
    <CausaNotificationGenerator
      causa={causa}
      privacyMode={privacyMode}
      initialSnapshot={initialSnapshot}
      documentStatus={activeDocument?.status ?? null}
      isProcessing={isProcessing}
      feedback={feedback}
      onSaveDraft={handleSaveDraft}
      onMarkNotified={handleMarkNotified}
      onAnnul={handleAnnul}
    />
  );
}
