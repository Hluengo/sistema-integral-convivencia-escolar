/** @license SPDX-License-Identifier: Apache-2.0 */

const METADATA_ONLY_PATTERN =
  /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b[\s\S]*\bTipo\s*:/i;

const GENERIC_REGISTRARS = [
  "PDF Convivencia Escolar",
  "PDF Importación Masiva",
];

// El texto extraído del PDF puede traer acentos descompuestos (o + U+0301)
// que no calzan con clases como [óo]; se normaliza a NFC antes de parsear.
function nfc(value: string): string {
  return value.normalize("NFC");
}

// Cola de metadatos arrastrada a un responsable ya guardado (filas
// importadas antes del endurecimiento del parser): se recorta para mostrar.
const REGISTRAR_TAIL_PATTERN =
  /\s*(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b[\s\S]*|(?:Tipo|Categoria|Anotaci[óo]n|Profesor)\s*:[\s\S]*|Ficha\s+Personal\b[\s\S]*)$/i;

function sanitizeRegistrar(value: string): string {
  return nfc(value).replace(REGISTRAR_TAIL_PATTERN, "").trim();
}

export function extractAnnotationCategory(text: string): string | null {
  const source = nfc(text);
  const bracket = source.match(/^\[([^\][]+)\]/)?.[1]?.trim();
  const raw =
    bracket ??
    source
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
  const raw =
    nfc(text)
      .match(/Profesor\s*:\s*(.+?)\s*$/i)?.[1]
      ?.trim() ?? "";
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
  const stored = registeredBy ? sanitizeRegistrar(registeredBy) : "";
  if (stored && !GENERIC_REGISTRARS.includes(stored.trim())) {
    return stored;
  }
  return extractAnnotationTeacher(text) ?? registeredBy ?? "";
}

export function formatAnnotationDisplayText(text: string): string {
  const normalized = nfc(text.replace(/\s+/g, " ").trim());
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
  if (withoutPrefix.length === 0) return visible;
  // Si solo quedan etiquetas y el valor de la categoría, no hay registro
  // propiamente tal: se informa en vez de repetir la insignia.
  if (
    isMetadataOnlyRemainder(
      withoutPrefix,
      extractAnnotationCategory(normalized),
    )
  ) {
    return "Sin descripción registrada en el PDF.";
  }
  return withoutPrefix;
}

function isMetadataOnlyRemainder(
  value: string,
  category: string | null,
): boolean {
  let rest = value
    .replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b[, ]*/g, "")
    .replace(/\b(Tipo|Categoria|Anotaci[óo]n|Profesor)\s*:?/gi, "");
  if (category) {
    const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    rest = rest.replace(new RegExp(escaped, "gi"), "");
  }
  return rest.replace(/[.\-–—:;,()\s]+/g, "").length === 0;
}
