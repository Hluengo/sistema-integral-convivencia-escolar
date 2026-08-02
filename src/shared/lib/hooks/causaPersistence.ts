/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa } from '@/src/shared/lib/types';

export interface CausaPersistenceChanges {
  causa: boolean;
  bitacora: boolean;
  checklist: boolean;
}

export interface ExistingCausaPersistenceOperations {
  updateCausa: (causa: Causa) => Promise<boolean>;
  saveBitacora: (
    causaId: string,
    entries: Causa['bitacora'],
    previousEntries: Causa['bitacora'],
  ) => Promise<boolean>;
  saveChecklist: (
    causaId: string,
    checklist: Causa['checklistDebidoProceso'],
    previousChecklist: Causa['checklistDebidoProceso'],
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
    relatedWrites.push(operations.saveBitacora(causa.id, causa.bitacora, previousCausa.bitacora));
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
