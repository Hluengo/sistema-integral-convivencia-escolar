/** @license SPDX-License-Identifier: Apache-2.0 */

import { useCallback, useState } from "react";
import type { Causa, BitacoraEntry, DocumentScope } from "../types";
import { nowDateOnly, nowIso } from "../../../shared/lib/dateUtils";
import {
  resolveDocumentOwnerId,
  uploadDocument,
} from "../../api/services/storage.service";

interface UseBitacoraLogArgs {
  causa: Causa;
  onUpdateCausa: (updated: Causa) => void;
}

export interface ManualBitacoraEntryInput {
  title: string;
  description: string;
  type: BitacoraEntry["tipo"];
  participants: string;
  documentFile?: File | null;
  documentText?: string;
  documentScope?: DocumentScope;
  actionDate?: string;
  entryId?: string;
}

export function buildManualBitacoraEntry(input: {
  title: string;
  description: string;
  type: BitacoraEntry["tipo"];
  participants: string;
  documentoAdjunto?: string;
  fecha?: string;
  entryId?: string;
}): BitacoraEntry | null {
  const normalizedTitle = input.title.trim();
  const normalizedDescription = input.description.trim();
  if (!normalizedTitle || !normalizedDescription) return null;

  const parsedParticipants = input.participants.trim()
    ? input.participants
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const participants =
    parsedParticipants.length > 0 ? parsedParticipants : ["No especificados"];

  return {
    id: `b_custom_${input.entryId ?? crypto.randomUUID()}`,
    fecha: input.fecha || nowIso(),
    tipo: input.type,
    titulo: normalizedTitle,
    descripcion: normalizedDescription,
    participantes: participants,
    ...(input.documentoAdjunto
      ? { documentoAdjunto: input.documentoAdjunto }
      : {}),
  };
}

export function useBitacoraLog({ causa, onUpdateCausa }: UseBitacoraLogArgs) {
  const [isCreatingManualLog, setIsCreatingManualLog] = useState(false);
  const [manualLogError, setManualLogError] = useState<string | null>(null);

  const createManualLog = useCallback(
    async ({
      title,
      description,
      type,
      participants: participantText,
      documentFile,
      documentText = "",
      documentScope = "causa",
      actionDate,
      entryId,
    }: ManualBitacoraEntryInput): Promise<string> => {
      if (isCreatingManualLog)
        throw new Error("Ya se está guardando una entrada.");
      setIsCreatingManualLog(true);
      setManualLogError(null);

      try {
        const scope =
          documentScope === "incidente" && causa.incidenteId
            ? "incidente"
            : "causa";
        const ownerId = resolveDocumentOwnerId(
          causa.id,
          causa.incidenteId,
          scope,
        );
        const evidenceFile =
          documentFile ??
          (documentText.trim()
            ? new File([documentText], "evidencia-pegada.txt", {
                type: "text/plain",
              })
            : null);
        const documentoAdjunto = evidenceFile
          ? await uploadDocument(ownerId, evidenceFile, "documentos")
          : undefined;
        const newEntry = buildManualBitacoraEntry({
          title,
          description:
            documentFile && documentText.trim()
              ? `${description}\n\nTexto de evidencia:\n${documentText}`
              : description,
          type,
          participants: participantText,
          documentoAdjunto,
          fecha: actionDate ? `${actionDate}T12:00:00.000Z` : undefined,
          entryId,
        });
        if (!newEntry)
          throw new Error("Ingrese el título y la descripción de la entrada.");
        newEntry.compartidoGrupal = scope === "incidente";

        onUpdateCausa({
          ...causa,
          bitacora: [
            newEntry,
            ...causa.bitacora.filter((entry) => entry.id !== newEntry.id),
          ],
          fechaUltimaActualizacion: nowDateOnly(),
        });
        return JSON.stringify(newEntry);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No fue posible guardar la entrada de bitácora.";
        setManualLogError(message);
        throw error;
      } finally {
        setIsCreatingManualLog(false);
      }
    },
    [causa, isCreatingManualLog, onUpdateCausa],
  );

  const resetManualLogError = useCallback(() => setManualLogError(null), []);

  return {
    createManualLog,
    isCreatingManualLog,
    manualLogError,
    resetManualLogError,
  };
}
