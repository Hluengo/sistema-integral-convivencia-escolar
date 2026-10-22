/** @license SPDX-License-Identifier: Apache-2.0 */

export function readSessionDraft<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeSessionDraft<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // El formulario sigue funcionando aunque el almacenamiento esté bloqueado.
  }
}

export function clearSessionDraft(key: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
}
