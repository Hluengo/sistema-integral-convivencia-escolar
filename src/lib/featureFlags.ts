/** @license SPDX-License-Identifier: Apache-2.0 */

import { onFeatureFlags as subscribeFeatureFlags } from './analytics';

const FLAG_DEFAULTS: Record<string, boolean | string> = {
  'new-timeline-design': false,
  'ai-advisor-v2': false,
  'bulk-annotation-import': false,
  'export-enhanced-pdf': false,
};

export type FeatureFlag = keyof typeof FLAG_DEFAULTS;

const listeners = new Map<string, Set<(value: boolean | string) => void>>();
let cachedFlags: Record<string, boolean | string> = { ...FLAG_DEFAULTS };
let unsubscribeFlags: (() => void) | null = null;

function init(): void {
  if (unsubscribeFlags) return;

  unsubscribeFlags = subscribeFeatureFlags((flags) => {
    for (const flag of flags) {
      cachedFlags[flag] = true;
    }
    notifyListeners();
  });
}

function notifyListeners(): void {
  for (const [flag, flagListeners] of listeners) {
    const value = cachedFlags[flag] ?? FLAG_DEFAULTS[flag] ?? false;
    for (const cb of flagListeners) {
      cb(value);
    }
  }
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  init();
  return !!(cachedFlags[flag] ?? FLAG_DEFAULTS[flag] ?? false);
}

export function getFeatureFlagValue(flag: FeatureFlag): boolean | string {
  init();
  return cachedFlags[flag] ?? FLAG_DEFAULTS[flag] ?? false;
}

export function onFeatureFlagChange(
  flag: FeatureFlag,
  callback: (value: boolean | string) => void,
): () => void {
  init();

  if (!listeners.has(flag)) {
    listeners.set(flag, new Set());
  }
  listeners.get(flag)!.add(callback);

  callback(cachedFlags[flag] ?? FLAG_DEFAULTS[flag] ?? false);

  return () => {
    listeners.get(flag)?.delete(callback);
  };
}

export function resetFeatureFlags(): void {
  cachedFlags = { ...FLAG_DEFAULTS };
  listeners.clear();
}
