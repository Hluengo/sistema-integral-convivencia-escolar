/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PersistedNotification } from './notifications.service';

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

class MockQueryBuilder<T> {
  table: string;
  result: { data: T | null; error: Error | null };

  constructor(table: string, result: { data: T | null; error: Error | null }) {
    this.table = table;
    this.result = result;
  }

  select(_columns?: string) {
    return this;
  }
  eq(_column: string, _value: unknown) {
    return this;
  }
  is(_column: string, _value: unknown) {
    return this;
  }
  order(_column: string, _opts?: { ascending?: boolean }) {
    return this;
  }
  limit(_n: number) {
    return this;
  }
  update(_row: Record<string, unknown>) {
    return this;
  }
  async then(
    onFulfilled?: (value: { data: T | null; error: Error | null }) => unknown,
  ): Promise<unknown> {
    return onFulfilled ? onFulfilled(this.result) : this.result;
  }
}

interface MutableSupabase {
  from: (table: string) => MockQueryBuilder<unknown>;
  rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: Error | null }>;
}

async function withNotificationMocks(options: {
  resultForTable: (table: string) => { data: unknown; error: Error | null };
  rpc?: (fn: string, params?: unknown) => Promise<{ data: unknown; error: Error | null }>;
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.from;
  const originalRpc = mutable.rpc;
  mutable.from = (table) => new MockQueryBuilder(table, options.resultForTable(table) as never);
  mutable.rpc = options.rpc ?? (async () => ({ data: null, error: null }));
  try {
    return await options.fn();
  } finally {
    mutable.from = originalFrom;
    mutable.rpc = originalRpc;
  }
}

function makeNotification(overrides: Partial<PersistedNotification> = {}): PersistedNotification {
  return {
    id: 'n-1',
    tenant_id: 'tenant-1',
    user_id: 'user-1',
    notification_key: 'causa-new-1',
    notification_type: 'causa_nueva',
    title: 'Nueva causa',
    description: 'Se abrió una nueva causa.',
    severity: 'info',
    entity_type: 'causa',
    entity_id: 'DC-2026-001',
    action_url: '/expedientes/DC-2026-001',
    read_at: null,
    expires_at: null,
    created_at: '2026-08-01T12:00:00.000Z',
    updated_at: '2026-08-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('fetchPersistedNotifications', () => {
  it('devuelve las notificaciones ordenadas por creación', async () => {
    const result = await withNotificationMocks({
      resultForTable: () => ({
        data: [makeNotification(), makeNotification({ id: 'n-2' })],
        error: null,
      }),
      fn: async () => {
        const { fetchPersistedNotifications } = await import('./notifications.service');
        return fetchPersistedNotifications();
      },
    });
    assert.equal((result as PersistedNotification[]).length, 2);
  });

  it('lanza error cuando la consulta falla', async () => {
    await assert.rejects(
      withNotificationMocks({
        resultForTable: () => ({ data: null, error: new Error('boom') }),
        fn: async () => {
          const { fetchPersistedNotifications } = await import('./notifications.service');
          return fetchPersistedNotifications();
        },
      }),
      /boom/,
    );
  });
});

describe('syncNotification', () => {
  const input = {
    notificationKey: 'causa-new-1',
    notificationType: 'causa_nueva',
    title: 'Nueva causa',
    description: 'Se abrió una nueva causa.',
    severity: 'info' as const,
    entityType: 'causa',
    entityId: 'DC-2026-001',
    actionUrl: '/expedientes/DC-2026-001',
    expiresAt: null,
  };

  it('invoca la RPC sync_notification con parámetros snake_case y devuelve el id', async () => {
    let capturedFn = '';
    let capturedParams: Record<string, unknown> | undefined;
    const result = await withNotificationMocks({
      resultForTable: () => ({ data: [], error: null }),
      rpc: async (fn, params) => {
        capturedFn = fn;
        capturedParams = params as Record<string, unknown>;
        return { data: 'n-99', error: null };
      },
      fn: async () => {
        const { syncNotification } = await import('./notifications.service');
        return syncNotification(input);
      },
    });
    assert.equal(capturedFn, 'sync_notification');
    assert.equal(capturedParams?.p_notification_key, 'causa-new-1');
    assert.equal(capturedParams?.p_severity, 'info');
    assert.equal(result, 'n-99');
  });

  it('lanza error cuando falla la RPC', async () => {
    await assert.rejects(
      withNotificationMocks({
        resultForTable: () => ({ data: [], error: null }),
        rpc: async () => ({ data: null, error: new Error('rpc denied') }),
        fn: async () => {
          const { syncNotification } = await import('./notifications.service');
          return syncNotification(input);
        },
      }),
      /rpc denied/,
    );
  });

  it('lanza error cuando la respuesta no es un string', async () => {
    await assert.rejects(
      withNotificationMocks({
        resultForTable: () => ({ data: [], error: null }),
        rpc: async () => ({ data: 42, error: null }),
        fn: async () => {
          const { syncNotification } = await import('./notifications.service');
          return syncNotification(input);
        },
      }),
      /Respuesta inválida/,
    );
  });
});

describe('setNotificationRead', () => {
  it('marca como leída y lanza error si falla', async () => {
    await withNotificationMocks({
      resultForTable: () => ({ data: null, error: null }),
      rpc: async () => ({ data: null, error: null }),
      fn: async () => {
        const { setNotificationRead } = await import('./notifications.service');
        await setNotificationRead('n-1', true);
      },
    });
  });

  it('lanza error cuando el update falla', async () => {
    await assert.rejects(
      withNotificationMocks({
        resultForTable: () => ({ data: null, error: new Error('update denied') }),
        fn: async () => {
          const { setNotificationRead } = await import('./notifications.service');
          await setNotificationRead('n-1', false);
        },
      }),
      /update denied/,
    );
  });
});

describe('markAllNotificationsRead', () => {
  it('marca todas las leídas sin error', async () => {
    await withNotificationMocks({
      resultForTable: () => ({ data: null, error: null }),
      fn: async () => {
        const { markAllNotificationsRead } = await import('./notifications.service');
        await markAllNotificationsRead();
      },
    });
  });

  it('lanza error cuando falla', async () => {
    await assert.rejects(
      withNotificationMocks({
        resultForTable: () => ({ data: null, error: new Error('denied') }),
        fn: async () => {
          const { markAllNotificationsRead } = await import('./notifications.service');
          await markAllNotificationsRead();
        },
      }),
      /denied/,
    );
  });
});
