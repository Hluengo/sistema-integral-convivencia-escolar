/** @license SPDX-License-Identifier: Apache-2.0 */

const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;
const MAX_ENTRIES = 10000;
const PRUNE_THRESHOLD = 5000;
let insertsSincePrune = 0;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function prune() {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    if (rateLimitMap.size >= MAX_ENTRIES) {
      prune();
    }
    insertsSincePrune++;
    if (insertsSincePrune >= PRUNE_THRESHOLD) {
      prune();
      insertsSincePrune = 0;
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  record.count++;
  return true;
}
