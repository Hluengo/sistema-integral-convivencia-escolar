/** @license SPDX-License-Identifier: Apache-2.0 */

import { createHash } from "node:crypto";
import { extractPdfPages } from "./disciplinaryPdfAnalysis.js";

export type BulkAnnotationType = "Positiva" | "Negativa" | "Información";

export interface BulkAnnotation {
  fecha_iso: string;
  tipo: BulkAnnotationType;
  categoria: string;
  profesor: string | null;
  texto: string;
  page_number: number | null;
}

export interface BulkStudent {
  nombre: string;
  curso: string;
  anotaciones: BulkAnnotation[];
  duplicados_eliminados: number;
}

export interface BulkPdfParseResult {
  file_hash: string;
  paginas: number;
  estudiantes: BulkStudent[];
  warnings: string[];
}

interface ExistingBulkAnnotation {
  type: string | null;
  date_time: string | null;
  observation: string | null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function bulkNameKey(value: string): string {
  return normalize(value).split(" ").sort().join(" ");
}

export const BULK_QUERY_CHUNK_SIZE = 20;
export const BULK_QUERY_MAX_ROWS = 1000;

export function chunkQueryIds(
  ids: string[],
  size = BULK_QUERY_CHUNK_SIZE,
): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}

export function bulkCourseKey(value: string): string {
  const text = normalize(value).replace(/\b(basico|basica)\b/g, "basico");
  const numberFirst = text.match(/^(\d+)\s*([a-z])\s*(medio|basico)$/);
  if (numberFirst)
    return `${numberFirst[1]} ${numberFirst[3]} ${numberFirst[2]}`;
  const levelFirst = text.match(/^(\d+)\s*(medio|basico)\s*([a-z])$/);
  return levelFirst
    ? `${levelFirst[1]} ${levelFirst[2]} ${levelFirst[3]}`
    : text;
}

export function bulkSuggestedLetterType(
  negativeCount: number,
  currentLetterType: string | null,
):
  | "Amonestación Escrita"
  | "Carta de Compromiso Conductual"
  | "Ficha de Derivación"
  | null {
  const suggested =
    negativeCount >= 15
      ? "Ficha de Derivación"
      : negativeCount >= 10
        ? "Carta de Compromiso Conductual"
        : negativeCount >= 5
          ? "Amonestación Escrita"
          : null;
  if (!suggested) return null;
  const rank = {
    "Amonestación Escrita": 1,
    "Carta de Compromiso Conductual": 2,
    "Ficha de Derivación": 3,
  } as const;
  const currentRank = currentLetterType
    ? (rank[currentLetterType as keyof typeof rank] ?? 0)
    : 0;
  return rank[suggested] > currentRank ? suggested : null;
}

function annotationKey(
  type: string,
  date: string | null,
  text: string,
): string {
  const cleanText =
    text
      .replace(/^\[[^\]]+\]\s*/, "")
      .split(/Anotaci[oó]n\s*:\s*/i)
      .at(-1)
      ?.split(/\s+Profesor\s*:/i)[0]
      .trim() ?? "";
  return `${normalize(type)}|${date?.slice(0, 10) ?? ""}|${normalize(cleanText)}`;
}

export function selectNewBulkAnnotations(
  annotations: BulkAnnotation[],
  existingRecords: ExistingBulkAnnotation[],
): BulkAnnotation[] {
  const existingCounts = new Map<string, number>();
  for (const record of existingRecords) {
    const key = annotationKey(
      record.type ?? "",
      record.date_time,
      record.observation ?? "",
    );
    existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
  }

  return annotations.filter((annotation) => {
    const key = annotationKey(
      annotation.tipo,
      annotation.fecha_iso,
      annotation.texto,
    );
    const remaining = existingCounts.get(key) ?? 0;
    if (remaining === 0) return true;
    existingCounts.set(key, remaining - 1);
    return false;
  });
}

function toIsoDate(value: string): string | null {
  const match = value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!match) return null;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /(^|[\s-])([a-záéíóúñ])/gi,
      (_, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`,
    );
}

function extractCourse(text: string): string {
  const match = text.match(
    /\b(\d{1,2})\s*(?:°?\s*(MEDIO|BASICO|BÁSICO|BASICA|BÁSICA)\s*([A-Z])|([A-Z])\s*(MEDIO|BASICO|BÁSICO|BASICA|BÁSICA))\b/i,
  );
  if (!match) return "";
  const levelValue = match[2] ?? match[5];
  const letter = match[3] ?? match[4];
  const level = normalize(levelValue) === "medio" ? "Medio" : "Básico";
  return `${match[1]}° ${level} ${letter.toUpperCase()}`;
}

function splitBlocks(
  text: string,
): Array<{ block: string; page: number | null }> {
  const blocks: Array<{ block: string; page: number | null }> = [];
  const normalized = text
    .split(String.fromCharCode(12))
    .join(" ")
    .replace(/\s+(?=\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  let current = "";
  for (const line of lines) {
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(line)) {
      if (current) blocks.push({ block: current, page: null });
      current = line;
    } else if (current) {
      current += ` ${line}`;
    }
  }
  if (current) blocks.push({ block: current, page: null });
  return blocks;
}

function tokenKey(value: string): string {
  return normalize(value);
}

export function stripTrailingStudentName(
  profesor: string | null,
  studentNames: string | Array<string | null> | null,
): string | null {
  if (!profesor) return profesor;
  const candidates = (
    Array.isArray(studentNames) ? studentNames : [studentNames]
  ).filter((name): name is string => !!name && name.trim().length > 0);
  if (!candidates.length) return profesor;
  const teacherWords = profesor.trim().split(/\s+/);
  if (teacherWords.length <= 2) return profesor;
  const normTeacher = teacherWords.map(tokenKey);
  let cleaned: string | null = null;
  let cleanedLength = 0;
  // El pie del PDF puede pegar el nombre de un estudiante (apellidos +
  // nombres) tras el nombre del profesor. Se prueban todos los candidatos y
  // todas las rotaciones de cada nombre, priorizando el recorte más largo.
  for (const candidate of candidates) {
    const studentWords = candidate.trim().split(/\s+/);
    if (studentWords.length < 2) continue;
    const maxK = Math.min(teacherWords.length - 2, studentWords.length);
    for (let k = maxK; k >= 2; k -= 1) {
      const tail = normTeacher.slice(-k).join(" ");
      for (let start = 0; start < studentWords.length; start += 1) {
        const rotated = [
          ...studentWords.slice(start),
          ...studentWords.slice(0, start),
        ].map(tokenKey);
        for (let i = 0; i + k <= rotated.length; i += 1) {
          if (rotated.slice(i, i + k).join(" ") === tail && k > cleanedLength) {
            cleaned = teacherWords.slice(0, -k).join(" ");
            cleanedLength = k;
          }
        }
      }
    }
  }
  return cleaned ?? profesor;
}

export function extractFullAnnotationText(block: string): string {
  // El generador del PDF repite los encabezados (Tipo/Categoria/Anotación) en
  // medio de la redacción y re-emite el texto acumulado: el primer fragmento
  // suele quedar cortado a mitad de frase. Se conserva el más completo.
  const segments = block.split(/Anotaci[óo]n\s*:\s*/i).slice(1);
  let best = "";
  for (const segment of segments) {
    const candidate = segment
      .split(/\s*Profesor\s*:/i)[0]
      .split(/\s*Tipo\s*:/i)[0]
      .replace(/\s+/g, " ")
      .trim();
    if (candidate.length > best.length) best = candidate;
  }
  return best;
}

export function cutTrailingFields(profesor: string | null): string | null {
  if (!profesor) return profesor;
  const cut = profesor
    .split(/\s*(?:Tipo|Categoria|Anotaci[óo]n)\s*:/i)[0]
    .trim();
  return cut.length > 0 ? cut : profesor;
}

function parseBlock(
  block: string,
  page: number | null,
  studentName: string | null = null,
): BulkAnnotation | null {
  if (!/Tipo\s*:/i.test(block)) return null;
  const date = block.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/)?.[1];
  const fecha_iso = date ? toIsoDate(date) : null;
  const tipo = block.match(
    /Tipo\s*:\s*(Negativa|Positiva|Informaci[óo]n)/i,
  )?.[1];
  if (!fecha_iso || !tipo) return null;
  const categoria =
    block
      .match(
        /Categoria\s*:\s*(RESPONSABILIDAD\s+Y\s+COMPORTAMIENTO|RESPONSABILIDAD|COMPORTAMIENTO|INFORMACI[ÓOÒ]N|ENTREVISTA)/i,
      )?.[1]
      ?.trim()
      .toUpperCase() ?? "SIN CATEGORIA";
  const rawProfesor =
    block
      .match(
        /Profesor\s*:\s*(.+?)(?=\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\s*(?:LUNES|MARTES|MIERCOLES|MIÉRCOLES|JUEVES|VIERNES|SABADO|SÁBADO|DOMINGO)\b|\s*(?:Tipo|Categoria|Anotaci[óo]n|Profesor)\s*:|\s*$)/i,
      )?.[1]
      ?.trim() ?? null;
  const profesor = stripTrailingStudentName(
    cutTrailingFields(rawProfesor),
    studentName,
  );
  const texto = extractFullAnnotationText(block);
  if (!texto) return null;
  return {
    fecha_iso,
    tipo: tipo.toLowerCase().startsWith("neg")
      ? "Negativa"
      : tipo.toLowerCase().startsWith("pos")
        ? "Positiva"
        : "Información",
    categoria,
    profesor,
    texto,
    page_number: page,
  };
}

export async function parseBulkDisciplinaryPdf(
  buffer: Uint8Array,
): Promise<BulkPdfParseResult> {
  const data = new Uint8Array(buffer);
  // El lector PDF transfiere el buffer al leerlo: el hash debe calcularse antes.
  const file_hash = createHash("sha256").update(data).digest("hex");
  const pages = await extractPdfPages(data);
  const fullText = pages.join("\x0c");
  const parts = fullText.split(/FICHA PERSONAL DE CONVIVENCIA ESCOLAR/i);
  const students: BulkStudent[] = [];
  const warnings: string[] = [];

  for (let index = 1; index < parts.length; index += 1) {
    const previousLines = parts[index - 1]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const nombre =
      (previousLines.at(-1) ?? "")
        .split(String.fromCharCode(12))
        .at(-1)
        ?.trim() ?? "";
    const body = parts[index];
    const curso = extractCourse(body);
    if (!nombre || !curso) {
      warnings.push(`Ficha ${index}: no se pudo identificar nombre o curso.`);
      continue;
    }
    const seen = new Set<string>();
    let duplicados_eliminados = 0;
    const anotaciones: BulkAnnotation[] = [];
    for (const { block, page } of splitBlocks(body)) {
      const annotation = parseBlock(block, page, nombre);
      if (!annotation) continue;
      const key = [
        annotation.fecha_iso,
        annotation.tipo,
        normalize(annotation.texto).slice(0, 160),
      ].join("|");
      if (seen.has(key)) {
        duplicados_eliminados += 1;
        continue;
      }
      seen.add(key);
      anotaciones.push(annotation);
    }
    students.push({
      nombre: titleCase(nombre),
      curso,
      anotaciones,
      duplicados_eliminados,
    });
  }

  // Segunda pasada: el nombre pegado puede ser el del estudiante siguiente,
  // que solo se conoce al terminar de recorrer todas las fichas.
  const allNames = students.map((student) => student.nombre);
  for (const student of students) {
    for (const annotation of student.anotaciones) {
      annotation.profesor = stripTrailingStudentName(
        annotation.profesor,
        allNames,
      );
    }
  }

  if (!students.length) warnings.push("No se encontraron fichas en el PDF.");
  return {
    file_hash,
    paginas: pages.length,
    estudiantes: students,
    warnings,
  };
}
