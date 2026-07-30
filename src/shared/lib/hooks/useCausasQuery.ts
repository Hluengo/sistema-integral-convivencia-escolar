/** @license SPDX-License-Identifier: Apache-2.0 */

import { useQuery } from '@tanstack/react-query';
import { fetchCausaDetails, fetchCausas } from '../../api/services/causas.service';
import { track } from '../../../lib/analytics';
import { useAuthStore } from '../stores/authStore';
import { causasQueryKeys } from '../queries/causasQueryKeys';

const CAUSAS_LIST_STALE_TIME_MS = 60_000;
const CAUSA_DETAILS_STALE_TIME_MS = 5 * 60_000;
const CAUSAS_CACHE_TIME_MS = 30 * 60_000;

function trackCausasQuery(scope: 'list' | 'detail', startedAt: number, resultCount: number): void {
  track('causas_query_completed', {
    scope,
    durationMs: Math.round(performance.now() - startedAt),
    resultCount,
  });
}

export function useCausasQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);

  return useQuery({
    queryKey: causasQueryKeys.list(tenantId ?? ''),
    queryFn: async () => {
      const startedAt = performance.now();
      const causas = await fetchCausas();
      trackCausasQuery('list', startedAt, causas.length);
      return causas;
    },
    enabled: isAuthenticated && Boolean(tenantId),
    staleTime: CAUSAS_LIST_STALE_TIME_MS,
    gcTime: CAUSAS_CACHE_TIME_MS,
  });
}

export function useCausaDetailsQuery(causaId: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tenantId = useAuthStore((state) => state.tenantId);

  return useQuery({
    queryKey: causasQueryKeys.details(tenantId ?? '', causaId),
    queryFn: async () => {
      const startedAt = performance.now();
      const details = await fetchCausaDetails(causaId);
      trackCausasQuery(
        'detail',
        startedAt,
        details.bitacora.length + details.checklistDebidoProceso.length,
      );
      return details;
    },
    enabled: isAuthenticated && Boolean(tenantId) && Boolean(causaId),
    staleTime: CAUSA_DETAILS_STALE_TIME_MS,
    gcTime: CAUSAS_CACHE_TIME_MS,
  });
}
