/** @license SPDX-License-Identifier: Apache-2.0 */

const ONBOARDING_STORAGE_PREFIX = 'onboarding_completed_v1';

export type OnboardingStepId = 'profile' | 'courses' | 'templates' | 'members' | 'rules';

export interface OnboardingState {
  completed: Partial<Record<OnboardingStepId, boolean>>;
  dismissed: boolean;
}

export function getOnboardingStorageKey(tenantId: string, userId: string): string {
  return `${ONBOARDING_STORAGE_PREFIX}:${tenantId}:${userId}`;
}

export function readOnboardingState(key: string): OnboardingState {
  if (typeof window === 'undefined') return { completed: {}, dismissed: false };

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { completed: {}, dismissed: false };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { completed: {}, dismissed: false };
    const value = parsed as { completed?: unknown; dismissed?: unknown };
    const completed =
      value.completed && typeof value.completed === 'object'
        ? (value.completed as Partial<Record<OnboardingStepId, boolean>>)
        : {};
    return { completed, dismissed: value.dismissed === true };
  } catch {
    return { completed: {}, dismissed: false };
  }
}

export function writeOnboardingState(key: string, state: OnboardingState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage can be unavailable in private browsing or restricted contexts.
  }
}
