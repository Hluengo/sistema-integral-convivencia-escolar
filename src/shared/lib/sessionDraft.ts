/** @license SPDX-License-Identifier: Apache-2.0 */

import type { z } from "zod";
import { useToastStore } from "./stores/toastStore";

const DRAFT_PREFIX = "draft:v2:";
const warnedKeys = new Set<string>();
export const SESSION_DRAFT_CLEARED_EVENT = "session-draft-cleared";

export function getSessionDraftKey(
  form: string,
  tenantId: string | null | undefined,
  userId: string | null | undefined,
  recordId = "new",
): string | null {
  if (!tenantId || !userId) return null;
  return `${DRAFT_PREFIX}${[userId, tenantId, form, recordId].map(encodeURIComponent).join(":")}`;
}

function warnStorageFailure(key: string) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  useToastStore
    .getState()
    .addToast(
      "warning",
      "No fue posible respaldar o limpiar el borrador en esta pestaña. Mantenga el formulario abierto y copie su trabajo antes de salir.",
    );
}

export function readSessionDraft<T extends object>(
  key: string | null,
  fallback: T,
  schema: z.ZodType<Partial<T>>,
): T {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? { ...fallback, ...result.data } : fallback;
  } catch {
    return fallback;
  }
}

export function writeSessionDraft<T>(key: string | null, value: T): boolean {
  if (!key || typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    warnedKeys.delete(key);
    return true;
  } catch {
    warnStorageFailure(key);
    return false;
  }
}

export function clearSessionDraft(
  key: string | null,
  expectedRaw?: string,
): boolean {
  if (!key || typeof window === "undefined") return false;
  try {
    if (
      expectedRaw !== undefined &&
      window.sessionStorage.getItem(key) !== expectedRaw
    )
      return false;
    window.sessionStorage.removeItem(key);
    window.sessionStorage.removeItem(key + ":pending-save");
    window.dispatchEvent?.(
      new CustomEvent(SESSION_DRAFT_CLEARED_EVENT, {
        detail: { key, expectedRaw },
      }),
    );
    return true;
  } catch {
    warnStorageFailure(key);
    return false;
  }
}

export function clearUserSessionDrafts(userId: string): boolean {
  if (typeof window === "undefined") return false;
  const prefix = `${DRAFT_PREFIX}${encodeURIComponent(userId)}:`;
  try {
    const storage = window.sessionStorage;
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) storage.removeItem(key);
    }
    return true;
  } catch {
    warnStorageFailure(prefix);
    return false;
  }
}

export function registerSessionDraftSave(
  key: string | null,
  result: string,
  expectedRaw?: string,
): void {
  if (!key || typeof window === "undefined") return;
  try {
    const raw = expectedRaw ?? window.sessionStorage.getItem(key);
    if (raw) {
      window.sessionStorage.setItem(
        key + ":pending-save",
        JSON.stringify({ raw, result }),
      );
    }
  } catch {
    warnStorageFailure(key);
  }
}

export function confirmSessionDraftSave(
  key: string | null,
  result: string,
): void {
  if (!key || typeof window === "undefined") return;
  try {
    const stored = window.sessionStorage.getItem(key + ":pending-save");
    if (!stored) return;
    const pending: unknown = JSON.parse(stored);
    if (
      !pending ||
      typeof pending !== "object" ||
      !("raw" in pending) ||
      typeof pending.raw !== "string" ||
      !("result" in pending) ||
      pending.result !== result
    )
      return;
    clearSessionDraft(key, pending.raw);
    window.sessionStorage.removeItem(key + ":pending-save");
  } catch {
    warnStorageFailure(key);
  }
}
