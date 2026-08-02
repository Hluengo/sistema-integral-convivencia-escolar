/** @license SPDX-License-Identifier: Apache-2.0 */

import type { InfiniteData } from '@tanstack/react-query';
import { queryClient } from '../../../lib/queryClient';
import type { Causa } from '../types';
import { causasQueryKeys } from './causasQueryKeys';
import type { CausasPage } from '../../api/services/causas.service';

type CausaDetails = Pick<Causa, 'bitacora' | 'checklistDebidoProceso'>;
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
 * Mezcla metadatos recientes del listado sin descartar antecedentes que ya se
 * solicitaron explícitamente para un expediente abierto.
 */
export function mergeCausasList(current: Causa[], freshList: Causa[]): Causa[] {
  const currentById = new Map(current.map((causa) => [causa.id, causa]));

  return freshList.map((freshCausa) => {
    const currentCausa = currentById.get(freshCausa.id);
    if (!currentCausa || !hasLoadedDetails(currentCausa)) return freshCausa;

    return {
      ...freshCausa,
      bitacora: currentCausa.bitacora,
      checklistDebidoProceso: currentCausa.checklistDebidoProceso,
    };
  });
}

export function addCausaToCache(tenantId: string, causa: Causa): void {
  queryClient.setQueryData<CausasListData>(causasQueryKeys.list(tenantId), (cached) => {
    if (!cached) return cached;
    return {
      ...cached,
      pages: cached.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              causas: [toListCausa(causa), ...page.causas.filter((item) => item.id !== causa.id)],
            }
          : { ...page, causas: page.causas.filter((item) => item.id !== causa.id) },
      ),
    };
  });
}

export function removeCausaFromCache(tenantId: string, causaId: string): void {
  queryClient.setQueryData<CausasListData>(causasQueryKeys.list(tenantId), (cached) =>
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
  queryClient.removeQueries({ queryKey: causasQueryKeys.details(tenantId, causaId), exact: true });
}

/** Actualiza sólo las entradas afectadas, sin volver a consultar Supabase. */
export function syncPersistedCausasToCache(tenantId: string, causas: Causa[]): void {
  const causasById = new Map(causas.map((causa) => [causa.id, causa]));

  queryClient.setQueryData<CausasListData>(causasQueryKeys.list(tenantId), (cached) =>
    cached
      ? {
          ...cached,
          pages: cached.pages.map((page) => ({
            ...page,
            causas: page.causas.map((cachedCausa) => {
              const persistedCausa = causasById.get(cachedCausa.id);
              return persistedCausa ? toListCausa(persistedCausa) : cachedCausa;
            }),
          })),
        }
      : cached,
  );

  for (const causa of causas) {
    const key = causasQueryKeys.details(tenantId, causa.id);
    if (queryClient.getQueryData<CausaDetails>(key)) {
      queryClient.setQueryData<CausaDetails>(key, {
        bitacora: causa.bitacora,
        checklistDebidoProceso: causa.checklistDebidoProceso,
      });
    }
  }
}
