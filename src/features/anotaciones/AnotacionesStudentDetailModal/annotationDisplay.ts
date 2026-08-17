/** @license SPDX-License-Identifier: Apache-2.0 */

export function formatAnnotationDisplayText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const parts = normalized.split(/\bAnotación:\s*/i);

  if (parts.length > 1) {
    const annotation = parts.at(-1)?.replace(/\s+(?:-\s*)?Profesor:\s*.*$/i, '').trim();
    if (annotation) return annotation;
  }

  return normalized;
}
