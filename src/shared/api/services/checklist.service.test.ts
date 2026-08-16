/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ChecklistItem } from '../../lib/types';

interface MutableRpcClient {
  rpc: (fn: string, params?: unknown) => Promise<{ data: unknown; error: Error | null }>;
}

process.env.VITE_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY ??= 'anon-key-for-unit-tests';

describe('saveChecklist', () => {
  it('prepara solo filas cambiadas e IDs removidos para la RPC atómica', async () => {
    const { buildChecklistSnapshotDelta } = await import('./checklist.service');
    const previous: ChecklistItem[] = [
      createChecklistItem({ id: 'permanece', completado: false }),
      createChecklistItem({ id: 'removido' }),
    ];
    const current: ChecklistItem[] = [
      createChecklistItem({ id: 'permanece', completado: true, documentoUrl: 'caso/doc.pdf' }),
      createChecklistItem({ id: 'nuevo' }),
    ];

    const delta = buildChecklistSnapshotDelta(current, previous);

    assert.deepEqual(delta.removedIds, ['removido']);
    assert.deepEqual(
      delta.rows.map((row) => row.id),
      ['permanece', 'nuevo'],
    );
    assert.equal(delta.rows[0].completado, true);
    assert.equal(delta.rows[0].documento_url, 'caso/doc.pdf');
    assert.equal(delta.rows[1].documento_url, null);
  });

  it('reporta false cuando la RPC transaccional falla', async () => {
    const [{ supabase }, { saveChecklist }] = await Promise.all([
      import('../lib/supabase'),
      import('./checklist.service'),
    ]);
    const rpcClient = supabase as unknown as MutableRpcClient;
    const originalRpc = rpcClient.rpc;
    const originalConsoleError = console.error;
    rpcClient.rpc = async () => ({ data: null, error: new Error('rollback') });
    console.error = () => undefined;

    try {
      const result = await saveChecklist('DC-2026-001', [createChecklistItem({ id: 'nuevo' })], []);

      assert.equal(result, false);
    } finally {
      rpcClient.rpc = originalRpc;
      console.error = originalConsoleError;
    }
  });
});

function createChecklistItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: 'item',
    label: 'Notificar apertura',
    descripcion: 'Registro obligatorio',
    completado: false,
    requeridoPor: 'Circular 482',
    ...overrides,
  };
}
