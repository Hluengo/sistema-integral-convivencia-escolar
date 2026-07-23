/** @license SPDX-License-Identifier: Apache-2.0 */

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';


type AnnotationType = 'negative' | 'positive' | 'information';
type StudentMatchStatus =
  | 'exact_match'
  | 'unique_normalized_match'
  | 'multiple_candidates'
  | 'no_match';
type ProcessingStatus = 'completed' | 'student_resolution' | 'ocr_required' | 'error';

export interface AnnotationSummary {
  negativas: number;
  positivas: number;
  informativas: number;
}

export interface DetectedAnnotation {
  raw_text: string;
  normalized_text: string;
  type: AnnotationType;
  page_number: number | null;
  sequence_number: number;
  detected_date: string | null;
  detected_teacher: string | null;
  classification_method: 'regex';
  confidence: number;
  parser_version: string;
}

export interface StudentCandidate {
  id: string;
  full_name: string;
  rut: string | null;
  course_id: string | null;
  course_name: string | null;
  confidence: number;
  match_status: StudentMatchStatus;
}

export interface AnalysisResult {
  success: true;
  analysis_id: string | null;
  file_id: string | null;
  process_id: null;
  detected_student_name: string | null;
  detectedName: string | null;
  student_candidates: StudentCandidate[];
  detectedStudents: StudentCandidate[];
  selected_student_id: string | null;
  detected_course: string | null;
  detectedCourse: string | null;
  negative_count: number;
  positive_count: number;
  information_count: number;
  summary: AnnotationSummary;
  annotations: DetectedAnnotation[];
  detectedAnnotations: DetectedAnnotation[];
  recommended_letter_type: string;
  suggestedLetterType: string;
  warnings: string[];
  processing_status: ProcessingStatus;
  mode: 'preview' | 'student_pending';
  file_hash: string;
  parser_version: string;
}

interface AnalyzeInput {
  bucket: string;
  storagePath: string;
  fileName: string;
  tenantId: string;
  authToken?: string;
}

interface ConfirmAnnotationInput {
  raw_text: string;
  normalized_text?: string;
  type: AnnotationType;
  page_number?: number | null;
  sequence_number: number;
  detected_date?: string | null;
  detected_teacher?: string | null;
  confidence?: number;
}

interface ConfirmInput {
  analysisId?: string | null;
  fileId?: string | null;
  bucket: string;
  storagePath: string;
  fileName: string;
  fileHash: string;
  fileSize?: number;
  mimeType?: string;
  tenantId: string;
  studentId: string;
  suggestedLetterType: string;
  annotations: ConfirmAnnotationInput[];
  idempotencyKey?: string;
  authToken?: string;
}

const PARSER_VERSION = 'disciplinary-pdf-parser-v1';
const PDF_BUCKET = 'disciplinary-processes';
const MAX_PDF_BYTES = 10 * 1024 * 1024;

type NodeDomMatrixInit = [number, number, number, number, number, number] | number[] | undefined;

class NodeDomMatrixPolyfill {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: NodeDomMatrixInit) {
    if (Array.isArray(init) && init.length >= 6) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }

  multiplySelf(other: NodeDomMatrixPolyfill): this {
    const a = this.a * other.a + this.c * other.b;
    const b = this.b * other.a + this.d * other.b;
    const c = this.a * other.c + this.c * other.d;
    const d = this.b * other.c + this.d * other.d;
    const e = this.a * other.e + this.c * other.f + this.e;
    const f = this.b * other.e + this.d * other.f + this.f;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  }

  preMultiplySelf(other: NodeDomMatrixPolyfill): this {
    const copy = new NodeDomMatrixPolyfill([other.a, other.b, other.c, other.d, other.e, other.f]);
    copy.multiplySelf(this);
    this.a = copy.a;
    this.b = copy.b;
    this.c = copy.c;
    this.d = copy.d;
    this.e = copy.e;
    this.f = copy.f;
    return this;
  }

  translate(tx = 0, ty = 0): NodeDomMatrixPolyfill {
    return new NodeDomMatrixPolyfill([
      this.a,
      this.b,
      this.c,
      this.d,
      this.e,
      this.f,
    ]).translateSelf(tx, ty);
  }

  translateSelf(tx = 0, ty = 0): this {
    return this.multiplySelf(new NodeDomMatrixPolyfill([1, 0, 0, 1, tx, ty]));
  }

  scale(scaleX = 1, scaleY = scaleX): NodeDomMatrixPolyfill {
    return new NodeDomMatrixPolyfill([this.a, this.b, this.c, this.d, this.e, this.f]).scaleSelf(
      scaleX,
      scaleY
    );
  }

  scaleSelf(scaleX = 1, scaleY = scaleX): this {
    return this.multiplySelf(new NodeDomMatrixPolyfill([scaleX, 0, 0, scaleY, 0, 0]));
  }

  invertSelf(): this {
    const determinant = this.a * this.d - this.b * this.c;
    if (!determinant) return this;
    const a = this.d / determinant;
    const b = -this.b / determinant;
    const c = -this.c / determinant;
    const d = this.a / determinant;
    const e = (this.c * this.f - this.d * this.e) / determinant;
    const f = (this.b * this.e - this.a * this.f) / determinant;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  }
}

class NodeImageDataPolyfill {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth;
      this.height = width ?? 0;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = width ?? 0;
      this.height = height ?? 0;
    }
  }
}

class NodePath2DPolyfill {
  addPath(): void {}
}

function ensurePdfJsNodePolyfills(): void {
  const globals = globalThis as Record<string, unknown>;
  globals.DOMMatrix ??= NodeDomMatrixPolyfill;
  globals.ImageData ??= NodeImageDataPolyfill;
  globals.Path2D ??= NodePath2DPolyfill;
}
interface PdfJsTextItem {
  str?: string;
  hasEOL?: boolean;
}

interface PdfJsPage {
  getTextContent(): Promise<{ items: PdfJsTextItem[] }>;
}

interface PdfJsDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
}

interface PdfJsModule {
  getDocument(input: { data: Uint8Array; useWorkerFetch?: boolean; isEvalSupported?: boolean }): {
    promise: Promise<PdfJsDocument>;
  };
}

interface PdfJsWorkerModule {
  WorkerMessageHandler: unknown;
}

export function getSupabaseAdmin(authToken?: string): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? '';
  const userScopedKey =
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  const supabaseKey = serviceKey || userScopedKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase no configurado');
  }

  const headers = !serviceKey && authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: headers ? { headers } : undefined,
  });
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDateRangeLine(value: string): boolean {
  return /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b\s*(?:a|-|hasta)\s*\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i.test(
    value
  );
}

function normalizeCourseLabel(value: string): string | null {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/º/g, '°')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  const match = normalized.match(/\b(\d{1,2})\s*(?:°\s*)?([A-Z])\s*(MEDIO|BASICO|BASICA)\b/);
  if (!match) return null;

  const level = Number(match[1]);
  const letter = match[2];
  const cycle = match[3].startsWith('MEDIO') ? 'Medio' : 'Básico';
  return `${level}° ${cycle} ${letter}`;
}

function courseMatchKey(value: string | null | undefined): string | null {
  const normalized = value ? normalizeCourseLabel(value) : null;
  return normalized ? normalizeText(normalized) : null;
}

function titleCaseFromUpper(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function assertStoragePathAllowed(bucket: string, storagePath: string, tenantId: string): void {
  if (bucket !== PDF_BUCKET) {
    throw new Error('Bucket de documentos disciplinarios no permitido');
  }

  if (!storagePath || storagePath.includes('..') || storagePath.startsWith('/')) {
    throw new Error('Ruta de archivo no válida');
  }

  const [tenantSegment] = storagePath.split('/');
  if (tenantSegment !== tenantId) {
    throw new Error('El archivo no pertenece al establecimiento activo');
  }
}

function isPdf(buffer: Uint8Array): boolean {
  if (buffer.byteLength < 5) return false;
  return String.fromCharCode(...buffer.slice(0, 5)) === '%PDF-';
}

function toIsoDate(date: string | undefined): string | null {
  if (!date) return null;
  const parts = date.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!parts) return null;
  const day = parts[1].padStart(2, '0');
  const month = parts[2].padStart(2, '0');
  const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
  return `${year}-${month}-${day}`;
}

async function extractPdfPages(buffer: Uint8Array): Promise<string[]> {
  ensurePdfJsNodePolyfills();
  const workerModule = (await import('pdfjs-dist/legacy/build/pdf.worker.mjs')) as PdfJsWorkerModule;
  (globalThis as Record<string, unknown>).pdfjsWorker = {
    WorkerMessageHandler: workerModule.WorkerMessageHandler,
  };
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as PdfJsModule;
  const pdf = await pdfjs.getDocument({
    data: buffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => (item.str ?? '') + (item.hasEOL ? '\n' : ' '))
      .join('')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim();
    pages.push(text);
  }

  return pages;
}

function extractCourse(text: string): string | null {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/\bcurso\b/i.test(line)) continue;

    const sameLineValue = line.replace(/^.*\bcurso\b\s*[:-]?\s*/i, '').trim();
    const candidates = [sameLineValue, lines[index + 1], lines[index + 2], lines[index + 3]];
    for (const candidate of candidates) {
      if (!candidate || /^rango\s+fechas?/i.test(candidate) || isDateRangeLine(candidate)) continue;
      const normalized = normalizeCourseLabel(candidate);
      if (normalized) return normalized;
    }
  }

  const normalizedText = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const courseMatch = normalizedText.match(/\b\d{1,2}\s*(?:°\s*)?[A-Z]\s*(?:MEDIO|BASICO|BASICA)\b/i);
  return courseMatch?.[0] ? normalizeCourseLabel(courseMatch[0]) : null;
}

function extractStudentName(text: string): string | null {
  const labelled = text.match(
    /(?:estudiante|alumno|nombre(?: completo)?)\s*[:-]\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ'-]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ'-]+){1,5})/i
  );
  if (labelled?.[1]) return labelled[1].trim();

  const fichaMatch = text.match(
    /([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ'-]+(?:\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ'-]+){2,6})\s+FICHA\s+PERSONAL\s+DE\s+CONVIVENCIA\s+ESCOLAR/i
  );
  if (fichaMatch?.[1]) return titleCaseFromUpper(fichaMatch[1].trim());

  const headingLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim())
    .filter(
      (line) => line.length > 1 && !/^(fundaci[oó]n|saber|ficha|rango|curso|fecha)/i.test(line)
    );

  if (headingLines.length >= 3)
    return `${headingLines[0]} ${headingLines[1]} ${headingLines.slice(2).join(' ')}`;
  if (headingLines.length > 0) return headingLines.join(' ');

  const uppercaseLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => {
      const normalized = normalizeText(line);
      const words = normalized.split(' ').filter(Boolean);
      return (
        words.length >= 3 &&
        words.length <= 6 &&
        line === line.toUpperCase() &&
        !normalized.includes('curso')
      );
    });

  return uppercaseLine ? titleCaseFromUpper(uppercaseLine) : null;
}

function splitAnnotationBlocks(pageText: string): string[] {
  const normalized = pageText.replace(/\s+(?=\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/g, '\n');
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: string[] = [];
  let current: string[] = [];
  let hasDatedRecords = false;

  for (const line of lines) {
    const startsDatedRecord = /(?:^|\s)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/.test(line);
    if (startsDatedRecord) {
      hasDatedRecords = true;
      if (current.length > 0) blocks.push(current.join(' '));
      current = [line];
      continue;
    }

    if (current.length > 0) {
      current.push(line);
    }
  }

  if (current.length > 0) blocks.push(current.join(' '));
  if (hasDatedRecords) return blocks;

  return lines.filter((line) => /\b(?:tipo|anotaci[oó]n|observaci[oó]n)\s*[:-]/i.test(line));
}

function classifyAnnotation(block: string): { type: AnnotationType | null; confidence: number } {
  const normalized = normalizeText(block);
  const typePattern =
    /(?:tipo|anotacion|observacion)\s*[:-]?\s*(negativa|positiva|informacion|informativa)/;
  const typed = normalized.match(typePattern);
  const value = typed?.[1];

  if (value?.startsWith('neg')) return { type: 'negative', confidence: 0.95 };
  if (value?.startsWith('pos')) return { type: 'positive', confidence: 0.95 };
  if (value?.startsWith('info')) return { type: 'information', confidence: 0.95 };
  if (/\b(reconocimiento|felicitacion|destaca|positiva)\b/.test(normalized))
    return { type: 'positive', confidence: 0.7 };
  if (/\b(negativa|falta|agresion|interrumpe|incumple|atraso)\b/.test(normalized))
    return { type: 'negative', confidence: 0.65 };
  if (/\b(informacion|informativa|entrevista|comunicacion)\b/.test(normalized))
    return { type: 'information', confidence: 0.65 };

  return { type: null, confidence: 0 };
}

function parseAnnotationsByPage(pages: string[]): DetectedAnnotation[] {
  const annotations: DetectedAnnotation[] = [];
  const seenAnnotations = new Set<string>();

  pages.forEach((pageText, pageIndex) => {
    const blocks = splitAnnotationBlocks(pageText);
    blocks.forEach((block) => {
      const classification = classifyAnnotation(block);
      if (!classification.type) return;
      const dateMatch = block.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/);
      const teacherMatch = block.match(/(?:profesor(?:a)?|responsable)\s*[:-]\s*([^|\n]{3,60})/i);

      const normalizedBlock = normalizeText(block);
      const detectedDate = toIsoDate(dateMatch?.[1]);
      const detectedTeacher = teacherMatch?.[1]?.trim() ?? null;
      const dedupeKey = [pageIndex + 1, classification.type, detectedDate ?? '', normalizedBlock].join('|');
      if (seenAnnotations.has(dedupeKey)) return;
      seenAnnotations.add(dedupeKey);

      annotations.push({
        raw_text: block.trim(),
        normalized_text: normalizedBlock,
        type: classification.type,
        page_number: pageIndex + 1,
        sequence_number: annotations.length + 1,
        detected_date: detectedDate,
        detected_teacher: detectedTeacher,
        classification_method: 'regex',
        confidence: classification.confidence,
        parser_version: PARSER_VERSION,
      });
    });
  });

  return annotations;
}

export function parseDisciplinaryTextPagesForTest(pages: string[]): {
  summary: AnnotationSummary;
  annotations: DetectedAnnotation[];
} {
  const annotations = parseAnnotationsByPage(pages);
  return { summary: summarizeAnnotations(annotations), annotations };
}

export function extractDisciplinaryMetadataForTest(text: string): {
  studentName: string | null;
  course: string | null;
} {
  return {
    studentName: extractStudentName(text),
    course: extractCourse(text),
  };
}
function summarizeAnnotations(annotations: DetectedAnnotation[]): AnnotationSummary {
  return annotations.reduce(
    (acc, annotation) => {
      if (annotation.type === 'negative') acc.negativas += 1;
      if (annotation.type === 'positive') acc.positivas += 1;
      if (annotation.type === 'information') acc.informativas += 1;
      return acc;
    },
    { negativas: 0, positivas: 0, informativas: 0 }
  );
}

async function enrichStudentRows(
  supabase: SupabaseClient,
  rows: Array<{ id: string; full_name: string; rut: string | null; course_id: string | null }>,
  confidence: number,
  status: StudentMatchStatus
): Promise<StudentCandidate[]> {
  if (rows.length === 0) return [];
  const courseIds = [...new Set(rows.map((row) => row.course_id).filter(Boolean))] as string[];
  const { data: courses } = courseIds.length
    ? await supabase.from('courses').select('id, name').in('id', courseIds)
    : { data: [] };
  const courseMap = new Map(
    (courses ?? []).map((course: { id: string; name: string }) => [course.id, course.name])
  );

  return rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    rut: row.rut,
    course_id: row.course_id,
    course_name: row.course_id ? (courseMap.get(row.course_id) ?? null) : null,
    confidence,
    match_status: status,
  }));
}

async function findStudentCandidates(
  supabase: SupabaseClient,
  tenantId: string,
  detectedName: string | null,
  detectedCourse: string | null
): Promise<{
  candidates: StudentCandidate[];
  selectedStudentId: string | null;
  status: StudentMatchStatus;
}> {
  if (!detectedName) return { candidates: [], selectedStudentId: null, status: 'no_match' };

  const baseSelect = 'id, full_name, rut, course_id';
  const exactName = detectedName.trim();
  const normalizedDetected = normalizeText(detectedName);
  const detectedCourseKey = courseMatchKey(detectedCourse);

  const { data: courseRows } = await supabase
    .from('courses')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .limit(200);
  const courseKeyById = new Map(
    (courseRows ?? []).map((course: { id: string; name: string }) => [
      course.id,
      courseMatchKey(course.name),
    ])
  );

  const { data: exactRows } = await supabase
    .from('students')
    .select(baseSelect)
    .eq('tenant_id', tenantId)
    .ilike('full_name', exactName)
    .limit(5);

  if (exactRows && exactRows.length > 0) {
    const candidates = await enrichStudentRows(
      supabase,
      exactRows,
      0.99,
      exactRows.length === 1 ? 'exact_match' : 'multiple_candidates'
    );
    return {
      candidates,
      selectedStudentId: candidates.length === 1 ? candidates[0].id : null,
      status: candidates.length === 1 ? 'exact_match' : 'multiple_candidates',
    };
  }

  const { data: tenantStudents } = await supabase
    .from('students')
    .select(baseSelect)
    .eq('tenant_id', tenantId)
    .limit(500);

  const normalizedMatches = (tenantStudents ?? []).filter(
    (student) => normalizeText(student.full_name) === normalizedDetected
  );
  if (normalizedMatches.length > 0) {
    const candidates = await enrichStudentRows(
      supabase,
      normalizedMatches,
      0.94,
      normalizedMatches.length === 1 ? 'unique_normalized_match' : 'multiple_candidates'
    );
    return {
      candidates,
      selectedStudentId: candidates.length === 1 ? candidates[0].id : null,
      status: candidates.length === 1 ? 'unique_normalized_match' : 'multiple_candidates',
    };
  }

  const detectedParts = new Set(normalizedDetected.split(' ').filter((part) => part.length >= 3));
  let approximate = (tenantStudents ?? [])
    .map((student) => {
      const studentParts = new Set(
        normalizeText(student.full_name)
          .split(' ')
          .filter((part) => part.length >= 3)
      );
      const overlap = [...detectedParts].filter((part) => studentParts.has(part)).length;
      const denominator = Math.max(detectedParts.size, studentParts.size, 1);
      const courseBoost =
        detectedCourseKey && student.course_id && courseKeyById.get(student.course_id) === detectedCourseKey
          ? 0.15
          : 0;
      return { student, score: overlap / denominator + courseBoost };
    })
    .filter((item) => item.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (approximate.length === 0 && detectedCourseKey) {
    const courseIds = (courseRows ?? [])
      .filter((course: { id: string; name: string }) => courseMatchKey(course.name) === detectedCourseKey)
      .map((course: { id: string }) => course.id);
    if (courseIds.length > 0) {
      const { data: courseStudents } = await supabase
        .from('students')
        .select(baseSelect)
        .eq('tenant_id', tenantId)
        .in('course_id', courseIds)
        .limit(50);
      approximate = (courseStudents ?? []).slice(0, 8).map((student) => ({ student, score: 0.45 }));
    }
  }

  const candidates = await enrichStudentRows(
    supabase,
    approximate.map((item) => item.student),
    approximate[0]?.score ?? 0,
    approximate.length > 0 ? 'multiple_candidates' : 'no_match'
  );

  return {
    candidates,
    selectedStudentId: null,
    status: candidates.length > 0 ? 'multiple_candidates' : 'no_match',
  };
}
function annotationTypeToLegacy(type: AnnotationType): 'Negativa' | 'Positiva' | 'Información' {
  if (type === 'positive') return 'Positiva';
  if (type === 'information') return 'Información';
  return 'Negativa';
}

function severityForAnnotation(type: AnnotationType): 'Leve' | 'Grave' | 'Muy Grave' | 'Gravísima' {
  return type === 'negative' ? 'Leve' : 'Leve';
}

function suggestedLetterToDocumentType(
  suggestedLetterType: string | null | undefined
): 'Amonestación Escrita' | 'Carta de Compromiso Conductual' | 'Ficha de Derivación' | null {
  if (suggestedLetterType === 'amonestacion') return 'Amonestación Escrita';
  if (suggestedLetterType === 'compromiso' || suggestedLetterType === 'compromiso_conductual') {
    return 'Carta de Compromiso Conductual';
  }
  if (suggestedLetterType === 'derivacion') return 'Ficha de Derivación';
  return null;
}

function suggestedLetterToStageName(suggestedLetterType: string | null | undefined): string | null {
  if (suggestedLetterType === 'amonestacion') return 'amonestacion';
  if (suggestedLetterType === 'compromiso' || suggestedLetterType === 'compromiso_conductual') {
    return 'compromiso';
  }
  if (suggestedLetterType === 'derivacion') return 'derivacion';
  return null;
}

async function syncConfirmedProcessToLegacyViews(
  supabase: SupabaseClient,
  input: ConfirmInput,
  processId: string,
  processNumber: string,
  summary: AnnotationSummary,
  student: { id: string; full_name?: string | null; course_id?: string | null }
): Promise<void> {
  const { data: existingRecords } = await supabase
    .from('inspectorate_records')
    .select('id')
    .eq('tenant_id', input.tenantId)
    .eq('student_id', input.studentId)
    .eq('pdf_file_path', input.storagePath)
    .limit(1);

  if (!existingRecords || existingRecords.length === 0) {
    const legacyRecords = input.annotations.map((annotation) => ({
      student_id: input.studentId,
      tenant_id: input.tenantId,
      date_time: annotation.detected_date ? `${annotation.detected_date}T12:00:00.000Z` : new Date().toISOString(),
      observation: annotation.raw_text,
      severity: severityForAnnotation(annotation.type),
      type: annotationTypeToLegacy(annotation.type),
      registered_by: 'PDF Convivencia Escolar',
      created_by: 'Sistema PDF',
      pdf_file_path: input.storagePath,
    }));

    if (legacyRecords.length > 0) {
      const { error } = await supabase.from('inspectorate_records').insert(legacyRecords);
      if (error) throw new Error('Error al registrar anotaciones en la vista de registros');
    }
  }

  const documentType = suggestedLetterToDocumentType(input.suggestedLetterType);
  let courseName = student.course_id || 'Sin curso';
  if (student.course_id) {
    const { data: course } = await supabase
      .from('courses')
      .select('name')
      .eq('tenant_id', input.tenantId)
      .eq('id', student.course_id)
      .maybeSingle();
    courseName = (course as { name?: string } | null)?.name || courseName;
  }
  const processMarker = `Proceso PDF ${processNumber} (${processId})`;

  if (documentType) {
    const { data: existingDocument } = await supabase
      .from('cartas_disciplinarias')
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('student_id', input.studentId)
      .ilike('observations', `%${processId}%`)
      .limit(1);

    if (!existingDocument || existingDocument.length === 0) {
      const { error } = await supabase.from('cartas_disciplinarias').insert({
        student_id: input.studentId,
        tenant_id: input.tenantId,
        letter_type: documentType,
        emission_date: new Date().toISOString().split('T')[0],
        status: 'Vigente',
        emitted_by: 'Convivencia Escolar',
        supervisor_name: null,
        apoderado_name: 'Por definir',
        annotations_count: summary.negativas,
        student_name: student.full_name || 'Estudiante seleccionado',
        course: courseName,
        regulation_basis: 'RICE 2026 - Registro de anotaciones y debido proceso',
        observations: `${processMarker}. Documento sugerido automáticamente desde PDF confirmado.`,
        created_by: 'Sistema PDF',
      });
      if (error) throw new Error('Error al registrar el documento sugerido');
    }
  }

  const stageName = suggestedLetterToStageName(input.suggestedLetterType);
  if (stageName) {
    const { data: existingStage } = await supabase
      .from('etapas_disciplinarias')
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('student_id', input.studentId)
      .eq('stage_name', stageName)
      .ilike('comment', `%${processId}%`)
      .limit(1);

    if (!existingStage || existingStage.length === 0) {
      const stepNumber = stageName === 'amonestacion' ? 1 : stageName === 'compromiso' ? 2 : 3;
      const { error } = await supabase.from('etapas_disciplinarias').insert({
        student_id: input.studentId,
        tenant_id: input.tenantId,
        step_number: stepNumber,
        stage_name: stageName,
        responsible: 'Convivencia Escolar',
        comment: `${processMarker}. Etapa sugerida automáticamente desde PDF confirmado.`,
        created_by: 'Sistema PDF',
      });
      if (error) throw new Error('Error al registrar la etapa disciplinaria sugerida');
    }
  }
}
async function getSuggestedLetter(
  supabase: SupabaseClient,
  tenantId: string,
  summary: AnnotationSummary
): Promise<string> {
  const { data, error } = await supabase.rpc('get_suggested_letter_type', {
    p_negativas: summary.negativas,
    p_positivas: summary.positivas,
    p_informativas: summary.informativas,
    p_tenant_id: tenantId,
  });

  if (error || !data) return 'none';
  return String(data);
}

export async function analyzeDisciplinaryPdf(input: AnalyzeInput): Promise<AnalysisResult> {
  const supabase = getSupabaseAdmin(input.authToken);
  assertStoragePathAllowed(input.bucket, input.storagePath, input.tenantId);

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(input.bucket)
    .download(input.storagePath);

  if (downloadError || !fileBlob) {
    throw new Error('No fue posible descargar el PDF privado desde Storage');
  }

  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  if (bytes.byteLength > MAX_PDF_BYTES) throw new Error('El PDF excede el tamaño máximo permitido');
  if (!input.fileName.toLowerCase().endsWith('.pdf') || !isPdf(bytes)) {
    throw new Error('El archivo no corresponde a un PDF válido');
  }

  const fileHash = createHash('sha256').update(bytes).digest('hex');
  const pages = await extractPdfPages(bytes);
  const textContent = pages.join('\n');
  const warnings: string[] = [];

  if (normalizeText(textContent).length < 20) {
    warnings.push('El PDF no contiene texto seleccionable suficiente. Puede requerir OCR.');
  }

  const detectedStudentName = extractStudentName(textContent);
  const detectedCourse = extractCourse(textContent);
  const annotations = normalizeText(textContent).length < 20 ? [] : parseAnnotationsByPage(pages);
  const summary = summarizeAnnotations(annotations);
  const recommendedLetterType = await getSuggestedLetter(supabase, input.tenantId, summary);
  const studentMatch = await findStudentCandidates(
    supabase,
    input.tenantId,
    detectedStudentName,
    detectedCourse
  );

  if (!detectedStudentName) warnings.push('No se pudo detectar un nombre de estudiante en el PDF.');
  if (annotations.length === 0 && normalizeText(textContent).length >= 20)
    warnings.push('No se detectaron anotaciones clasificables en el documento.');
  if (studentMatch.status === 'multiple_candidates')
    warnings.push('Se requiere confirmar el estudiante porque existen múltiples candidatos.');
  if (studentMatch.status === 'no_match')
    warnings.push('Se requiere seleccionar manualmente un estudiante autorizado.');

  const processingStatus: ProcessingStatus =
    normalizeText(textContent).length < 20
      ? 'ocr_required'
      : studentMatch.selectedStudentId
        ? 'completed'
        : 'student_resolution';

  const { data: analysisRow } = await supabase
    .from('document_analyses')
    .insert({
      student_id: studentMatch.selectedStudentId,
      file_name: input.fileName,
      negativas: summary.negativas,
      positivas: summary.positivas,
      informativas: summary.informativas,
      tenant_id: input.tenantId,
      status: processingStatus,
      detected_student_name: detectedStudentName,
      detected_course: detectedCourse,
      student_match_status: studentMatch.status,
      warnings,
      file_hash: fileHash,
      parser_version: PARSER_VERSION,
    })
    .select('id')
    .maybeSingle();

  return {
    success: true,
    analysis_id: (analysisRow as { id?: string } | null)?.id ?? null,
    file_id: null,
    process_id: null,
    detected_student_name: detectedStudentName,
    detectedName: detectedStudentName,
    student_candidates: studentMatch.candidates,
    detectedStudents: studentMatch.candidates,
    selected_student_id: studentMatch.selectedStudentId,
    detected_course: detectedCourse,
    detectedCourse,
    negative_count: summary.negativas,
    positive_count: summary.positivas,
    information_count: summary.informativas,
    summary,
    annotations,
    detectedAnnotations: annotations,
    recommended_letter_type: recommendedLetterType,
    suggestedLetterType: recommendedLetterType,
    warnings,
    processing_status: processingStatus,
    mode: studentMatch.selectedStudentId ? 'preview' : 'student_pending',
    file_hash: fileHash,
    parser_version: PARSER_VERSION,
  };
}

export async function confirmDisciplinaryProcess(
  input: ConfirmInput
): Promise<{ success: true; processId: string; processNumber: string }> {
  const supabase = getSupabaseAdmin(input.authToken);
  assertStoragePathAllowed(input.bucket, input.storagePath, input.tenantId);

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, tenant_id, full_name, course_id')
    .eq('id', input.studentId)
    .eq('tenant_id', input.tenantId)
    .maybeSingle();

  if (studentError || !student) {
    throw new Error('El estudiante seleccionado no pertenece al establecimiento activo');
  }

  const summary = summarizeAnnotations(
    input.annotations.map((annotation, index) => ({
      raw_text: annotation.raw_text,
      normalized_text: annotation.normalized_text ?? normalizeText(annotation.raw_text),
      type: annotation.type,
      page_number: annotation.page_number ?? null,
      sequence_number: annotation.sequence_number || index + 1,
      detected_date: annotation.detected_date ?? null,
      detected_teacher: annotation.detected_teacher ?? null,
      classification_method: 'regex',
      confidence: annotation.confidence ?? 0.8,
      parser_version: PARSER_VERSION,
    }))
  );

  if (input.idempotencyKey) {
    const { data: existing } = await supabase
      .from('disciplinary_process_files')
      .select('process_id, disciplinary_processes(process_number)')
      .eq('tenant_id', input.tenantId)
      .eq('storage_path', input.storagePath)
      .maybeSingle();
    if (existing && (existing as { process_id?: string }).process_id) {
      const nested = (existing as { disciplinary_processes?: { process_number?: string } })
        .disciplinary_processes;
      const existingProcessId = (existing as { process_id: string }).process_id;
      const existingProcessNumber = nested?.process_number ?? '';
      await syncConfirmedProcessToLegacyViews(
        supabase,
        input,
        existingProcessId,
        existingProcessNumber,
        summary,
        student as { id: string; full_name?: string | null; course_id?: string | null }
      );
      return {
        success: true,
        processId: existingProcessId,
        processNumber: existingProcessNumber,
      };
    }
  }

  const { data: processNumber, error: numberError } = await supabase.rpc(
    'generate_process_number',
    {
      p_tenant_id: input.tenantId,
    }
  );
  if (numberError || !processNumber) throw new Error('Error al generar número de proceso');

  const { data: processRow, error: processError } = await supabase
    .from('disciplinary_processes')
    .insert({
      student_id: input.studentId,
      process_number: processNumber,
      status: 'draft',
      tenant_id: input.tenantId,
      suggested_letter_type: input.suggestedLetterType || 'none',
      total_negativas: summary.negativas,
      total_positivas: summary.positivas,
      total_informativas: summary.informativas,
      is_completed: false,
    })
    .select('id, process_number')
    .single();

  if (processError || !processRow) throw new Error('Error al crear proceso disciplinario');

  const processId = (processRow as { id: string }).id;
  const confirmedAnnotations = input.annotations.map((annotation, index) => ({
    process_id: processId,
    student_id: input.studentId,
    annotation_type:
      annotation.type === 'negative'
        ? 'Negativa'
        : annotation.type === 'positive'
          ? 'Positiva'
          : 'Información',
    annotation_text: annotation.raw_text,
    line_number: annotation.sequence_number || index + 1,
    annotation_date: annotation.detected_date,
    teacher_name: annotation.detected_teacher,
    category: annotation.type,
    raw_text: annotation.raw_text,
    normalized_text: annotation.normalized_text ?? normalizeText(annotation.raw_text),
    page_number: annotation.page_number ?? null,
    position_in_page: annotation.sequence_number || index + 1,
    classification_method: 'regex',
    confidence: annotation.confidence ?? 0.8,
    parser_version: PARSER_VERSION,
    confirmed_annotation_type: annotation.type,
    tenant_id: input.tenantId,
  }));

  const { error: fileError } = await supabase.from('disciplinary_process_files').insert({
    process_id: processId,
    file_name: input.fileName,
    storage_path: input.storagePath,
    file_size: input.fileSize ?? 0,
    mime_type: input.mimeType ?? 'application/pdf',
    file_hash: input.fileHash,
    bucket: input.bucket,
    original_file_name: input.fileName,
    stored_file_name: input.storagePath.split('/').pop() || input.fileName,
    processing_status: 'confirmed',
    analysis_version: PARSER_VERSION,
    student_id: input.studentId,
    tenant_id: input.tenantId,
  });
  if (fileError) throw new Error('Error al vincular el PDF al proceso');

  if (confirmedAnnotations.length > 0) {
    const { error: annotationsError } = await supabase
      .from('disciplinary_annotations_detected')
      .insert(confirmedAnnotations);
    if (annotationsError) throw new Error('Error al guardar las anotaciones detectadas');
  }

  await syncConfirmedProcessToLegacyViews(
    supabase,
    input,
    processId,
    String((processRow as { process_number: string }).process_number),
    summary,
    student as { id: string; full_name?: string | null; course_id?: string | null }
  );
  await supabase.from('document_analyses').insert({
    student_id: input.studentId,
    file_name: input.fileName,
    negativas: summary.negativas,
    positivas: summary.positivas,
    informativas: summary.informativas,
    tenant_id: input.tenantId,
    status: 'confirmed',
    process_id: processId,
    file_hash: input.fileHash,
    parser_version: PARSER_VERSION,
    confirmed_at: new Date().toISOString(),
  });

  return {
    success: true,
    processId,
    processNumber: String((processRow as { process_number: string }).process_number),
  };
}
