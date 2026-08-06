/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DisciplinaryRule } from './disciplinary-rules.service';

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
  order(_column: string, _opts?: { ascending?: boolean }) {
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
}

async function withRulesMocks(options: {
  resultForTable: (table: string) => { data: unknown; error: Error | null };
  tenantId?: string | null;
  fn: () => Promise<unknown>;
}): Promise<unknown> {
  const { supabase } = await import('../lib/supabase');
  const mutable = supabase as unknown as MutableSupabase;
  const originalFrom = mutable.from;
  const originalConsoleError = console.error;
  mutable.from = (table) => new MockQueryBuilder(table, options.resultForTable(table) as never);
  console.error = () => undefined;
  const { useAuthStore } = await import('@/src/shared/lib/stores/authStore');
  const originalTenantId = useAuthStore.getState().tenantId;
  useAuthStore.setState({ tenantId: options.tenantId ?? null });
  try {
    return await options.fn();
  } finally {
    mutable.from = originalFrom;
    console.error = originalConsoleError;
    useAuthStore.setState({ tenantId: originalTenantId });
  }
}

function makeRule(overrides: Partial<DisciplinaryRule> = {}): DisciplinaryRule {
  return {
    id: 'rule-1',
    rule_type: 'negativas',
    rule_name: 'Reincidencia en falta grave',
    description: null,
    min_negativas: 3,
    max_negativas: null,
    min_positivas: null,
    max_positivas: null,
    min_informativas: null,
    max_informativas: null,
    suggested_letter_type: 'compromiso',
    priority: 10,
    is_active: true,
    ...overrides,
  };
}

describe('fetchDisciplinaryRules', () => {
  it('retorna las reglas activas del tenant ordenadas por prioridad', async () => {
    let capturedTable = '';
    const result = await withRulesMocks({
      tenantId: 'tenant-1',
      resultForTable: (table) => {
        capturedTable = table;
        return { data: [makeRule(), makeRule({ id: 'rule-2', priority: 5 })], error: null };
      },
      fn: async () => {
        const { fetchDisciplinaryRules } = await import('./disciplinary-rules.service');
        return fetchDisciplinaryRules();
      },
    });
    assert.equal(capturedTable, 'disciplinary_rules');
    const rules = result as DisciplinaryRule[];
    assert.equal(rules.length, 2);
    assert.equal(rules[0].id, 'rule-1');
  });

  it('retorna lista vacía sin tenant activo', async () => {
    const result = await withRulesMocks({
      tenantId: null,
      resultForTable: () => ({ data: [], error: null }),
      fn: async () => {
        const { fetchDisciplinaryRules } = await import('./disciplinary-rules.service');
        return fetchDisciplinaryRules();
      },
    });
    assert.deepEqual(result, []);
  });

  it('retorna lista vacía cuando hay error', async () => {
    const result = await withRulesMocks({
      tenantId: 'tenant-1',
      resultForTable: () => ({ data: null, error: new Error('boom') }),
      fn: async () => {
        const { fetchDisciplinaryRules } = await import('./disciplinary-rules.service');
        return fetchDisciplinaryRules();
      },
    });
    assert.deepEqual(result, []);
  });
});
