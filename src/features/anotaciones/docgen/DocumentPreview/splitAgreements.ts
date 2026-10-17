/** @license SPDX-License-Identifier: Apache-2.0 */

export function splitAgreements(text: string): string[] {
  const byLines = text
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  if (byLines.length > 1) return byLines;
  const single = byLines[0] ?? "";
  if (single.length < 400) return byLines;
  const bySentences = single
    .split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.endsWith(".") ? item : item + "."));
  return bySentences.length > 1 ? bySentences : byLines;
}
