/** @license SPDX-License-Identifier: Apache-2.0 */

const METADATA_ONLY_PATTERN =
  /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b[\s\S]*\bTipo\s*:/i;

const GENERIC_REGISTRARS = [
  "PDF Convivencia Escolar",
  "PDF Importación Masiva",
];

export function extractAnnotationCategory(text: string): string | null {
  const bracket = text.match(/^\[([^\][]+)\]/)?.[1]?.trim();
  const raw =
    bracket ??
    text
      .match(
        /Categoria\s*:\s*([A-ZÁÉÍÓÚÑÒ ]+?)(?=\s*(?:Tipo|Categoria|Anotaci[óo]n|Profesor)\s*:|\s*$)/i,
      )?.[1]
      ?.trim() ??
    "";
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (normalized.length === 0) return null;
  if (normalized === "INFORMACION") return "INFORMACIÓN";
  return normalized;
}

export function extractAnnotationTeacher(text: string): string | null {
  const raw = text.match(/Profesor\s*:\s*(.+?)\s*$/i)?.[1]?.trim() ?? "";
  const cut = raw
    .split(/\s*(?:Tipo|Categoria|Anotaci[óo]n|Profesor)\s*:/i)[0]
    .trim()
    .replace(/\s+\.+$/, "");
  return cut.length > 1 ? cut : null;
}

export function resolveAnnotationRegistrar(
  registeredBy: string | null | undefined,
  text: string,
): string {
  if (registeredBy && !GENERIC_REGISTRARS.includes(registeredBy.trim())) {
    return registeredBy;
  }
  return extractAnnotationTeacher(text) ?? registeredBy ?? "";
}

export function formatAnnotationDisplayText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  // Bloques sin texto de anotación (solo fecha, tipo y profesor): las tarjetas
  // ya muestran esos datos en sus insignias, así que no se repiten.
  if (
    !/\bAnotación:\s*/i.test(normalized) &&
    !/^\[[^\][]+\]\s*/.test(normalized) &&
    METADATA_ONLY_PATTERN.test(normalized)
  ) {
    return "Sin descripción registrada en el PDF.";
  }
  const parts = normalized.split(/\bAnotación:\s*/i);

  let visible = normalized;
  if (parts.length > 1) {
    const annotation = parts
      .at(-1)
      ?.replace(/\s+(?:-\s*)?Profesor:\s*.*$/i, "")
      .trim();
    if (annotation) visible = annotation;
  }

  // El lote masivo guarda la categoría como prefijo `[CATEGORIA]`; el flujo
  // individual nunca la muestra, así que se oculta para igualar ambas vistas.
  const withoutPrefix = visible.replace(/^\[[^\][]+\]\s*/, "").trim();
  return withoutPrefix.length > 0 ? withoutPrefix : visible;
}
