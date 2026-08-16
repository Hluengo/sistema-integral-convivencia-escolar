/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { withSupabaseReadRetry } from './supabaseRetry';

describe('withSupabaseReadRetry', () => {
  it('reintenta errores de transporte y devuelve la respuesta posterior', async () => {
    let calls = 0;
    const result = await withSupabaseReadRetry(async () => {
      calls += 1;
      return calls < 2
        ? { data: null, error: { code: '', message: 'TypeError: Failed to fetch' } }
        : { data: ['ok'], error: null };
    });

    assert.equal(calls, 2);
    assert.deepEqual(result.data, ['ok']);
    assert.equal(result.error, null);
  });

  it('no reintenta errores funcionales o de autorización', async () => {
    let calls = 0;
    const result = await withSupabaseReadRetry(async () => {
      calls += 1;
      return { data: null, error: { code: '42501', message: 'new row violates RLS policy' } };
    });

    assert.equal(calls, 1);
    assert.equal(result.error?.code, '42501');
  });
});
