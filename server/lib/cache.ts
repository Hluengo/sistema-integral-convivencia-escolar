/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'node:crypto';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { value: string; expiresAt: number }>();

export function getCacheKey(endpoint: string, body: unknown): string {
  const hash = crypto.createHash('sha256');
  hash.update(endpoint);
  hash.update(JSON.stringify(body));
  return hash.digest('hex');
}

export function getFromCache(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCache(key: string, value: string): void {
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}
