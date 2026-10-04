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
 *
 * Los bloques se intentan todos aunque falle el núcleo: antes un fallo del
 * update descartaba los guardados de bitácora y checklist (p. ej. un hito
 * marcado como grupal se veía local pero nunca llegaba a la base ni a los
 * expedientes hermanos). El false se mantiene para que el reintento
 * re-encole todo. Un rechazo (throw) cuenta como bloque fallido, nunca como
 * excepción propagada.
 */
export async function persistExistingCausa(
  causa: Causa,
  previousCausa: Causa,
  changes: CausaPersistenceChanges,
  operations: ExistingCausaPersistenceOperations,
): Promise<boolean> {
  const attempt = async (write: Promise<boolean>): Promise<boolean> => {
    try {
      return await write;
    } catch {
      return false;
    }
  };
  const pendingWrites: Promise<boolean>[] = [];
  if (changes.causa) {
    pendingWrites.push(attempt(operations.updateCausa(causa)));
  }
  if (changes.bitacora) {
    pendingWrites.push(
      attempt(
        operations.saveBitacora(
          causa.id,
          causa.bitacora,
          previousCausa.bitacora,
        ),
      ),
    );
  }
  if (changes.checklist) {
    pendingWrites.push(
      attempt(
        operations.saveChecklist(
          causa.id,
          causa.checklistDebidoProceso,
          previousCausa.checklistDebidoProceso,
        ),
      ),
    );
  }

  const results = await Promise.all(pendingWrites);
  return results.every(Boolean);
}
