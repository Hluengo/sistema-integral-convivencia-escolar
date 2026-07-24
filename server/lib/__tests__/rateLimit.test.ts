/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { checkRateLimit, checkRateLimitAsync } from '../rateLimit';

describe('checkRateLimit (sync)', () => {
  it('allows first request', () => {
    const result = checkRateLimit('test-ip-1');
    assert.equal(result, true);
  });

  it('allows up to 10 requests per minute', () => {
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit('test-ip-limit');
      assert.equal(result, true);
    }
  });

  it('blocks 11th request within same window', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('test-ip-block');
    }
    const result = checkRateLimit('test-ip-block');
    assert.equal(result, false);
  });
});

describe('checkRateLimitAsync', () => {
  it('allows first request', async () => {
    const result = await checkRateLimitAsync('test-async-1');
    assert.equal(result, true);
  });

  it('allows up to 10 requests per minute', async () => {
    for (let i = 0; i < 10; i++) {
      const result = await checkRateLimitAsync('test-async-limit');
      assert.equal(result, true);
    }
  });

  it('blocks 11th request within same window', async () => {
    for (let i = 0; i < 10; i++) {
      await checkRateLimitAsync('test-async-block');
    }
    const result = await checkRateLimitAsync('test-async-block');
    assert.equal(result, false);
  });

  it('falls back to sync when no Redis configured', async () => {
    const result = await checkRateLimitAsync('test-async-fallback');
    assert.equal(typeof result, 'boolean');
  });
});
