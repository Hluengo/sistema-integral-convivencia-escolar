/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from "../lib/supabase";
import type { Json } from "../lib/database.types";
import type { ChecklistItem } from "../../lib/types";
import { normalizeDocumentPath } from "./storage.service";

function itemsAreEqual(left: ChecklistItem, right: ChecklistItem): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

interface ChecklistSnapshotRow {
  id: string;
  label: string;
  descripcion: string;
  completado: boolean;
  fecha_completado: string | null;
  obligatorio: boolean | null;
  aplicabilidad: ChecklistItem["aplicabilidad"] | null;
  estado: ChecklistItem["estado"] | null;
  fundamento_no_aplica: string | null;
  fecha_inicio: string | null;
  fecha_limite: string | null;
  resultado: string | null;
  bloqueante_para_avanzar: boolean | null;
  bloqueante_para_cerrar: boolean | null;
  requerido_por: ChecklistItem["requeridoPor"];
  registrado_por: string | null;
  observaciones: string | null;
  documento_nombre: string | null;
  documento_url: string | null;
}

export function buildChecklistSnapshotDelta(
  items: ChecklistItem[],
  previousItems: ChecklistItem[] = [],
): { rows: ChecklistSnapshotRow[]; removedIds: string[] } {
  const previousById = new Map(previousItems.map((item) => [item.id, item]));
  const rows = items
    .filter((item) => {
      const previous = previousById.get(item.id);
      return !previous || !itemsAreEqual(item, previous);
    })
    .map((item) => ({
      id: item.id,
      label: item.label,
      descripcion: item.descripcion,
      completado: item.completado,
      fecha_completado: item.fechaCompletado || null,
      obligatorio: item.obligatorio ?? null,
      aplicabilidad: item.aplicabilidad ?? null,
      estado: item.estado ?? null,
      fundamento_no_aplica: item.fundamentoNoAplica || null,
      fecha_inicio: item.fechaInicio || null,
      fecha_limite: item.fechaLimite || null,
      resultado: item.resultado || null,
      bloqueante_para_avanzar: item.bloqueanteParaAvanzar ?? null,
      bloqueante_para_cerrar: item.bloqueanteParaCerrar ?? null,
      requerido_por: item.requeridoPor,
      registrado_por: item.registradoPor || null,
      observaciones: item.observaciones || null,
      documento_nombre: item.documentoNombre || null,
      documento_url: item.documentoUrl
        ? normalizeDocumentPath(item.documentoUrl)
        : null,
    }));

  const activeIds = new Set(items.map((item) => item.id));
  const removedIds = previousItems
    .filter((item) => !activeIds.has(item.id))
    .map((item) => item.id);

  return { rows, removedIds };
}

export async function saveChecklist(
  causaId: string,
  items: ChecklistItem[],
  previousItems: ChecklistItem[] = [],
): Promise<boolean> {
  const { rows, removedIds } = buildChecklistSnapshotDelta(
    items,
    previousItems,
  );

  if (rows.length === 0 && removedIds.length === 0) return true;

  const { error } = await supabase.rpc("save_checklist_snapshot", {
    p_causa_id: causaId,
    p_items: rows as unknown as Json,
    p_removed_item_ids: removedIds as unknown as Json,
  });

  if (error) {
    console.error("Error saving checklist snapshot:", error.message || error);
    return false;
  }

  return true;
}
