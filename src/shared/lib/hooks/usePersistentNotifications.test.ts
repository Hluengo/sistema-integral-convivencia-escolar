/** @license SPDX-License-Identifier: Apache-2.0 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(
  resolve(import.meta.dirname!, 'usePersistentNotifications.ts'),
  'utf-8',
);

describe('usePersistentNotifications realtime lifecycle', () => {
  it('cierra el canal Realtime antes de entrar al BFCache', () => {
    assert.ok(source.includes("window.addEventListener('pagehide', removeRealtimeChannel)"));
    assert.ok(source.includes('void supabase.removeChannel(channel)'));
  });

  it('recrea la suscripción y refresca datos al volver desde BFCache', () => {
    assert.ok(source.includes("window.addEventListener('pageshow', handlePageShow)"));
    assert.ok(source.includes('if (!event.persisted) return'));
    assert.ok(source.includes('setRealtimeLifecycleKey((current) => current + 1)'));
    assert.ok(source.includes("queryKey: ['notifications', tenantId, userId]"));
  });
});
