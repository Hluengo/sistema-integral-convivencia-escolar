/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PublicDashboardKpis } from './public-dashboard.service';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

interface MutableSupabase {
  rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: Error | null }>;
}

async function withPublicDashboardMocks(options: {
  rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: Error | null }>;
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalRpc = mutable.rpc;
  mutable.rpc = options.rpc;
  try {
    return await options.fn();
  } finally {
    mutable.rpc = originalRpc;
  }
}

function makeRpcRow(
  overrides: Record<string, number | string> = {},
): Record<string, number | string> {
  return {
    total_causes: 10,
    active_causes: 4,
    investigation_causes: 2,
    resolved_causes: 6,
    critical_alerts: 1,
    leve_count: 3,
    grave_count: 4,
    muy_grave_count: 2,
    gravisima_count: 1,
    amonestacion_count: 5,
    compromiso_count: 3,
    derivacion_count: 2,
    ...overrides,
  };
}

describe('fetchPublicDashboardKpis', () => {
  it('mapea la fila de la RPC a camelCase numérico', async () => {
    const result = (await withPublicDashboardMocks({
      rpc: async (fn) => {
        assert.equal(fn, 'get_public_dashboard_kpis');
        return { data: [makeRpcRow()], error: null };
      },
      fn: async () => {
        const { fetchPublicDashboardKpis } = await import('./public-dashboard.service');
        return fetchPublicDashboardKpis();
      },
    })) as PublicDashboardKpis;
    assert.equal(result.totalCauses, 10);
    assert.equal(result.activeCauses, 4);
    assert.equal(result.gravisimaCount, 1);
    assert.equal(result.derivacionCount, 2);
  });

  it('convierte strings numéricos y usa 0 como fallback', async () => {
    const result = (await withPublicDashboardMocks({
      rpc: async () => ({ data: [makeRpcRow({ total_causes: '25' })], error: null }),
      fn: async () => {
        const { fetchPublicDashboardKpis } = await import('./public-dashboard.service');
        return fetchPublicDashboardKpis();
      },
    })) as PublicDashboardKpis;
    assert.equal(result.totalCauses, 25);
  });

  it('retorna KPIs vacíos cuando la fila no existe', async () => {
    const result = (await withPublicDashboardMocks({
      rpc: async () => ({ data: [], error: null }),
      fn: async () => {
        const { fetchPublicDashboardKpis } = await import('./public-dashboard.service');
        return fetchPublicDashboardKpis();
      },
    })) as PublicDashboardKpis;
    assert.equal(result.totalCauses, 0);
    assert.equal(result.criticalAlerts, 0);
  });

  it('lanza error cuando falla la RPC', async () => {
    await assert.rejects(
      withPublicDashboardMocks({
        rpc: async () => ({ data: null, error: new Error('rpc denied') }),
        fn: async () => {
          const { fetchPublicDashboardKpis } = await import('./public-dashboard.service');
          return fetchPublicDashboardKpis();
        },
      }),
      /rpc denied/,
    );
  });
});
