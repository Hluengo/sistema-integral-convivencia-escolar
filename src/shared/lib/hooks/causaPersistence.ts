/** @license SPDX-License-Identifier: Apache-2.0 */

import type { Causa } from '@/src/types';

export interface ExistingCausaPersistenceOperations {
  updateCausa: (causa: Causa) => Promise<boolean>;
  saveBitacora: (causaId: string, entries: Causa['bitacora']) => Promise<boolean>;
  saveChecklist: (causaId: string, checklist: Causa['checklistDebidoProceso']) => Promise<boolean>;
}

/**
 * Guarda solamente expedientes que ya existen.
 *
 * Un fallo de actualización nunca debe convertirse en una creación: puede
 * representar pérdida de red, falta de permisos o una restricción RLS.
 */
export async function persistExistingCausa(
  causa: Causa,
  operations: ExistingCausaPersistenceOperations,
): Promise<boolean> {
  const updated = await operations.updateCausa(causa);
  if (!updated) return false;

  const [bitacoraSaved, checklistSaved] = await Promise.all([
    operations.saveBitacora(causa.id, causa.bitacora),
    operations.saveChecklist(causa.id, causa.checklistDebidoProceso),
  ]);

  return bitacoraSaved && checklistSaved;
}
