/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa, BitacoraEntry } from '../types';
import { nowDateOnly, nowIso } from '../../../shared/lib/dateUtils';

interface UseBitacoraLogArgs {
  causa: Causa;
  onUpdateCausa: (updated: Causa) => void;
}

export interface ManualBitacoraEntryInput {
  title: string;
  description: string;
  type: BitacoraEntry['tipo'];
  participants: string;
}

export function useBitacoraLog({ causa, onUpdateCausa }: UseBitacoraLogArgs) {
  const createManualLog = async ({
    title,
    description,
    type,
    participants: participantText,
  }: ManualBitacoraEntryInput): Promise<void> => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    if (!normalizedTitle || !normalizedDescription) return;

    const parsedParticipants = participantText.trim()
      ? participantText
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const participants = parsedParticipants.length > 0 ? parsedParticipants : ['No especificados'];

    const newEntry: BitacoraEntry = {
      id: `b_custom_${crypto.randomUUID()}`,
      fecha: nowIso(),
      tipo: type,
      titulo: normalizedTitle,
      descripcion: normalizedDescription,
      participantes: participants,
    };

    onUpdateCausa({
      ...causa,
      bitacora: [newEntry, ...causa.bitacora],
      fechaUltimaActualizacion: nowDateOnly(),
    });
  };

  return {
    createManualLog,
  };
}
