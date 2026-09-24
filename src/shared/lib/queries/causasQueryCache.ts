/** @license SPDX-License-Identifier: Apache-2.0 */

import type { InfiniteData } from "@tanstack/react-query";
import { queryClient } from "../../../lib/queryClient";
import type { Causa, ChecklistItem } from "../types";
import { causasQueryKeys } from "./causasQueryKeys";
import type { CausasPage } from "../../api/services/causas.service";

type CausasListData = InfiniteData<CausasPage, number>;

function toListCausa(causa: Causa): Causa {
  return {
    ...causa,
    bitacora: [],
    checklistDebidoProceso: [],
  };
}

function hasLoadedDetails(causa: Causa): boolean {
  return causa.bitacora.length > 0 || causa.checklistDebidoProceso.length > 0;
}

/**
 * Fusiona hitos por id: el avance fresco siempre gana y los metadatos ricos
 * ya cargados (etiqueta, documentos) se conservan.
 *
 * El avance es monótono (los hitos del debido proceso no retroceden): si el
 * hito ya figura completado en el estado local —p. ej. un tick optimista aún
 * no autoguardado— se conserva aunque el resumen fresco todavía no lo traiga.
 * Así la tabla refleja el avance de hitos sin necesidad de abrir el expediente.
 */
export function mergeChecklistItems(
  current: ChecklistItem[],
  fresh: ChecklistItem[],
): ChecklistItem[] {
  if (fresh.length === 0) return current;
  const freshById = new Map(fresh.map((item) => [item.id, item]));
  const merged = current.map((item) => {
    const freshItem = freshById.get(item.id);
    if (!freshItem) return item;
    const completado = item.completado || freshItem.completado;
    return {
      ...item,
      completado,
      fechaCompletado: completado
        ? (freshItem.fechaCompletado ?? item.fechaCompletado)
        : undefined,
    };
  });
  for (const freshItem of fresh) {
    if (!merged.some((item) => item.id === freshItem.id))
      merged.push(freshItem);
  }
  return merged;
}

/**
 * Mezcla metadatos recientes del listado sin descartar antecedentes que ya se
 * solicitaron explícitamente para un expediente abierto. Los hitos se fusionan
 * por ítem (ver `mergeChecklistItems`) para que el avance fresco —dentro o fuera
 * del modal— se refleje en la tabla.
 */
export function mergeCausasList(current: Causa[], freshList: Causa[]): Causa[] {
  const currentById = new Map(current.map((causa) => [causa.id, causa]));

  return freshList.map((freshCausa) => {
    const currentCausa = currentById.get(freshCausa.id);
    if (!currentCausa || !hasLoadedDetails(currentCausa)) return freshCausa;

    return {
      ...freshCausa,
      bitacora: currentCausa.bitacora,
      checklistDebidoProceso: mergeChecklistItems(
        currentCausa.checklistDebidoProceso,
        freshCausa.checklistDebidoProceso,
      ),
    };
  });
}

export function addCausaToCache(tenantId: string, causa: Causa): void {
  queryClient.setQueryData<CausasListData>(
    causasQueryKeys.list(tenantId),
    (cached) => {
      if (!cached) return cached;
      return {
        ...cached,
        pages: cached.pages.map((page, index) =>
          index === 0
            ? {
                ...page,
                causas: [
                  toListCausa(causa),
                  ...page.causas.filter((item) => item.id !== causa.id),
                ],
              }
            : {
                ...page,
                causas: page.causas.filter((item) => item.id !== causa.id),
              },
        ),
      };
    },
  );
}

export function removeCausaFromCache(tenantId: string, causaId: string): void {
  queryClient.setQueryData<CausasListData>(
    causasQueryKeys.list(tenantId),
    (cached) =>
      cached
        ? {
            ...cached,
            pages: cached.pages.map((page) => ({
              ...page,
              causas: page.causas.filter((causa) => causa.id !== causaId),
            })),
          }
        : cached,
  );
  queryClient.removeQueries({
    queryKey: causasQueryKeys.details(tenantId, causaId),
    exact: true,
  });
}

/** Actualiza sólo las entradas afectadas, sin volver a consultar Supabase. */
export function syncPersistedCausasToCache(
  tenantId: string,
  causas: Causa[],
): void {
  const causasById = new Map(causas.map((causa) => [causa.id, causa]));

  queryClient.setQueryData<CausasListData>(
    causasQueryKeys.list(tenantId),
    (cached) =>
      cached
        ? {
            ...cached,
            pages: cached.pages.map((page) => ({
              ...page,
              causas: page.causas.map((cachedCausa) => {
                const persistedCausa = causasById.get(cachedCausa.id);
                return persistedCausa
                  ? toListCausa(persistedCausa)
                  : cachedCausa;
              }),
            })),
          }
        : cached,
  );

  for (const causa of causas) {
    const key = causasQueryKeys.details(tenantId, causa.id);
    if (queryClient.getQueryData<Causa>(key)) {
      queryClient.setQueryData<Causa>(key, causa);
    }
  }
}
