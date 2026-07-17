/** @license SPDX-License-Identifier: Apache-2.0 */

import type { SupabaseClient } from '@supabase/supabase-js';

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
  delete: () => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  in: (col: string, vals: unknown[]) => QueryBuilder;
  order: (col: string, opts?: { ascending?: boolean }) => QueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  single: () => Promise<{ data: unknown; error: null }>;
};

type FromResult = {
  select: (columns: string) => QueryBuilder;
  insert: (values: unknown) => { select: () => { single: () => Promise<{ data: unknown; error: null }> }; error: null };
  update: (values: unknown) => QueryBuilder;
  delete: () => QueryBuilder;
};

export function createMockSupabase(
  tables: Record<string, Record<string, unknown>[]>
): SupabaseClient {
  const data: Record<string, Record<string, unknown>[]> = { ...tables };

  function queryTable(table: string): QueryBuilder {
    let rows = [...(data[table] || [])];

    const q: QueryBuilder = {
      select(_columns: string) {
        return q;
      },
      insert(values: unknown) {
        const newRow = values as Record<string, unknown>;
        data[table] = data[table] || [];
        data[table].push(newRow);
        return q;
      },
      update(values: unknown) {
        return q;
      },
      delete() {
        return q;
      },
      eq(col: string, val: unknown) {
        rows = rows.filter((r) => r[col] === val);
        return q;
      },
      in(col: string, vals: unknown[]) {
        rows = rows.filter((r) => vals.includes(r[col]));
        return q;
      },
      order(_col: string, _opts?: { ascending?: boolean }) {
        return q;
      },
      async maybeSingle() {
        return { data: rows[0] || null, error: null };
      },
      async single() {
        return { data: rows[0] || null, error: null };
      },
    };

    return q;
  }

  return {
    from: (table: string): FromResult => {
      const builder = queryTable(table);
      return {
        select: (columns: string) => builder.select(columns),
        insert: (values: unknown) => ({
          select: () => ({
            single: async () => ({ data: null, error: null }),
          }),
          error: null,
        }),
        update: (values: unknown) => builder,
        delete: () => builder,
      };
    },
    rpc: async (_fn: string, _params?: Record<string, unknown>) => ({
      data: null,
      error: { message: 'RPC not mocked' },
    }),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  } as unknown as SupabaseClient;
}
