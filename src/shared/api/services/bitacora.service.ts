/** @license SPDX-License-Identifier: Apache-2.0 */

import { supabase } from "../lib/supabase";
import type { Json } from "../lib/database.types";
import type { BitacoraEntry } from "../../lib/types";
import { normalizeDocumentPath } from "./storage.service";

function entriesAreEqual(left: BitacoraEntry, right: BitacoraEntry): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

interface BitacoraSnapshotRow {
  id: string;
  fecha: string;
  tipo: BitacoraEntry["tipo"];
  titulo: string;
  descripcion: string;
  participantes: string[];
  documento_adjunto: string | null;
  compartido_grupal: boolean;
}

export function buildBitacoraSnapshotDelta(
  entries: BitacoraEntry[],
  previousEntries: BitacoraEntry[] = [],
  ownerCausaId?: string,
): { rows: BitacoraSnapshotRow[]; removedIds: string[] } {
  const isInherited = (entry: BitacoraEntry) =>
    Boolean(
      ownerCausaId &&
      entry.causaOrigenId &&
      entry.causaOrigenId !== ownerCausaId,
    );
  const writableEntries = entries.filter((entry) => !isInherited(entry));
  const writablePreviousEntries = previousEntries.filter(
    (entry) => !isInherited(entry),
  );
  const previousById = new Map(
    writablePreviousEntries.map((entry) => [entry.id, entry]),
  );
  const rows = writableEntries
    .filter((entry) => {
      const previous = previousById.get(entry.id);
      return !previous || !entriesAreEqual(entry, previous);
    })
    .map((entry) => ({
      id: entry.id,
      fecha: entry.fecha,
      tipo: entry.tipo,
      titulo: entry.titulo,
      descripcion: entry.descripcion,
      participantes: entry.participantes || [],
      documento_adjunto: entry.documentoAdjunto
        ? normalizeDocumentPath(entry.documentoAdjunto)
        : null,
      compartido_grupal: entry.compartidoGrupal ?? false,
    }));

  const activeIds = new Set(writableEntries.map((entry) => entry.id));
  const removedIds = writablePreviousEntries
    .filter((entry) => !activeIds.has(entry.id))
    .map((entry) => entry.id);

  return { rows, removedIds };
}

export async function saveBitacora(
  causaId: string,
  entries: BitacoraEntry[],
  previousEntries: BitacoraEntry[] = [],
): Promise<boolean> {
  const { rows, removedIds } = buildBitacoraSnapshotDelta(
    entries,
    previousEntries,
    causaId,
  );

  if (rows.length === 0 && removedIds.length === 0) return true;

  const { error } = await supabase.rpc("save_bitacora_snapshot", {
    p_causa_id: causaId,
    p_entries: rows as unknown as Json,
    p_removed_entry_ids: removedIds as unknown as Json,
  });

  if (error) {
    console.error("Error saving bitacora snapshot:", error.message || error);
    return false;
  }
  return true;
}
