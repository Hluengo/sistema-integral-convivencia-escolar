/** @license SPDX-License-Identifier: Apache-2.0 */

import { getBaseChecklist } from '../data';
import type { BitacoraEntry, ChecklistItem } from '../types';
import { toDateOnly } from '../../../lib/dateUtils';

const REGISTRATION_PREFIX = 'Registro de Hito: ';
const RESET_PREFIX = 'Invalidador Hito: ';
const RESPONSIBLE_MARKER = 'Responsable: ';
const OBSERVATIONS_MARKER = '. Observaciones: ';

function parseRegistrationDescription(description: string): {
  responsable?: string;
  observaciones?: string;
} {
  const responsibleStart = description.indexOf(RESPONSIBLE_MARKER);
  if (responsibleStart < 0) return {};

  const valueStart = responsibleStart + RESPONSIBLE_MARKER.length;
  const observationsStart = description.indexOf(OBSERVATIONS_MARKER, valueStart);
  if (observationsStart < 0) {
    return { responsable: description.slice(valueStart).trim() || undefined };
  }

  return {
    responsable: description.slice(valueStart, observationsStart).trim() || undefined,
    observaciones:
      description.slice(observationsStart + OBSERVATIONS_MARKER.length).trim() || undefined,
  };
}

function documentNameFromPath(path?: string): string | undefined {
  if (!path) return undefined;
  const name = path.split('/').pop();
  if (!name) return undefined;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export function reconcileChecklistFromBitacora(
  persistedItems: ChecklistItem[],
  bitacora: BitacoraEntry[],
): ChecklistItem[] {
  const items = getBaseChecklist();
  const indexById = new Map(items.map((item, index) => [item.id, index]));
  const idByLabel = new Map(items.map((item) => [item.label, item.id]));

  for (const persisted of persistedItems) {
    const index = indexById.get(persisted.id);
    if (index === undefined) continue;
    items[index] = { ...items[index], ...persisted };
  }

  const orderedEntries = [...bitacora].sort(
    (left, right) => new Date(left.fecha).getTime() - new Date(right.fecha).getTime(),
  );

  for (const entry of orderedEntries) {
    const isRegistration = entry.titulo.startsWith(REGISTRATION_PREFIX);
    const isReset = entry.titulo.startsWith(RESET_PREFIX);
    if (!isRegistration && !isReset) continue;

    const label = entry.titulo.slice(
      isRegistration ? REGISTRATION_PREFIX.length : RESET_PREFIX.length,
    );
    const itemId = idByLabel.get(label);
    const index = itemId ? indexById.get(itemId) : undefined;
    if (index === undefined) continue;

    if (isReset) {
      items[index] = {
        ...items[index],
        completado: false,
        fechaCompletado: undefined,
        registradoPor: undefined,
        observaciones: undefined,
        documentoNombre: undefined,
        documentoUrl: undefined,
      };
      continue;
    }

    const metadata = parseRegistrationDescription(entry.descripcion);
    const entryDate = new Date(entry.fecha);
    const fechaCompletado = Number.isNaN(entryDate.getTime())
      ? items[index].fechaCompletado
      : toDateOnly(entryDate);

    items[index] = {
      ...items[index],
      completado: true,
      fechaCompletado,
      registradoPor: metadata.responsable || entry.participantes[0] || items[index].registradoPor,
      observaciones: metadata.observaciones || items[index].observaciones,
      documentoNombre: documentNameFromPath(entry.documentoAdjunto) || items[index].documentoNombre,
      documentoUrl: entry.documentoAdjunto || items[index].documentoUrl,
    };
  }

  return items;
}
