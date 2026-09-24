/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa } from "@/shared/lib/types";

export interface CausaPersistenceChanges {
  causa: boolean;
  bitacora: boolean;
  checklist: boolean;
}

export interface PendingCausaSave {
  changes: CausaPersistenceChanges;
  previousCausa: Causa;
}

/**
 * Fusiona un guardado pendiente con uno entrante: conserva la foto previa
 * m�s antigua (para el diff) y une los bloques modificados.
 */
export function mergePendingCausaSave(
  existing: PendingCausaSave | undefined,
  incoming: PendingCausaSave,
): PendingCausaSave {
  if (!existing) return incoming;
  return {
    previousCausa: existing.previousCausa,
    changes: {
      causa: existing.changes.causa || incoming.changes.causa,
      bitacora: existing.changes.bitacora || incoming.changes.bitacora,
      checklist: existing.changes.checklist || incoming.changes.checklist,
    },
  };
}

export interface ExistingCausaPersistenceOperations {
  updateCausa: (causa: Causa) => Promise<boolean>;
  saveBitacora: (
    causaId: string,
    entries: Causa["bitacora"],
    previousEntries: Causa["bitacora"],
  ) => Promise<boolean>;
  saveChecklist: (
    causaId: string,
    checklist: Causa["checklistDebidoProceso"],
    previousChecklist: Causa["checklistDebidoProceso"],
  ) => Promise<boolean>;
}

/**
 * Guarda solamente expedientes que ya existen.
 *
 * Un fallo de actualización nunca debe convertirse en una creación: puede
 * representar pérdida de red, falta de permisos o una restricción RLS.
 */
export async function persistExistingCausa(
  causa: Causa,
  previousCausa: Causa,
  changes: CausaPersistenceChanges,
  operations: ExistingCausaPersistenceOperations,
): Promise<boolean> {
  if (changes.causa) {
    const updated = await operations.updateCausa(causa);
    if (!updated) return false;
  }

  const relatedWrites: Promise<boolean>[] = [];
  if (changes.bitacora) {
    relatedWrites.push(
      operations.saveBitacora(causa.id, causa.bitacora, previousCausa.bitacora),
    );
  }
  if (changes.checklist) {
    relatedWrites.push(
      operations.saveChecklist(
        causa.id,
        causa.checklistDebidoProceso,
        previousCausa.checklistDebidoProceso,
      ),
    );
  }

  const relatedResults = await Promise.all(relatedWrites);
  return relatedResults.every(Boolean);
}
