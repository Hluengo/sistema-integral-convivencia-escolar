/** @license SPDX-License-Identifier: Apache-2.0 */

import { inflateRawSync } from 'node:zlib';
import type { AuthenticatedRequest } from '../../types.js';
import { httpsGetBuffer } from '../lib/https.js';

const STORAGE_BUCKET = 'documentos_convivencia';
const MAX_DOCUMENTS = 10;
const MAX_EXTRACTED_CHARS_PER_DOCUMENT = 30_000;
const MAX_EXTRACTED_CHARS_TOTAL = 80_000;

function getSupabaseHostname(): string {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!supabaseUrl || !URL.canParse(supabaseUrl)) throw new Error('Supabase no configurado');
  return new URL(supabaseUrl).hostname;
}

function normalizeStoragePath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('..')) return null;
  if (!/^https?:\/\//i.test(trimmed)) return trimmed.replace(/^\/+/, '');
  try {
    const url = new URL(trimmed);
    const marker = `/storage/v1/object/authenticated/${STORAGE_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(url.pathname.slice(index + marker.length)) : null;
  } catch {
    return null;
  }
}

function fileName(path: string): string {
  return decodeURIComponent(path.split('/').at(-1) || path);
}

function storagePathname(storagePath: string): string {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
  return `/storage/v1/object/authenticated/${STORAGE_BUCKET}/${encodedPath}`;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractDocxText(buffer: Buffer): string {
  const endSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const localSignature = 0x04034b50;
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === endSignature) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error('El DOCX no contiene un directorio ZIP válido.');

  const directorySize = buffer.readUInt32LE(endOffset + 12);
  const directoryOffset = buffer.readUInt32LE(endOffset + 16);
  const directoryEnd = directoryOffset + directorySize;
  let offset = directoryOffset;
  while (offset < directoryEnd) {
    if (buffer.readUInt32LE(offset) !== centralSignature)
      throw new Error('El DOCX tiene un directorio ZIP inválido.');
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (name === 'word/document.xml') {
      if (buffer.readUInt32LE(localOffset) !== localSignature)
        throw new Error('El DOCX no contiene el documento principal.');
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const xml =
        compression === 8 ? inflateRawSync(compressed) : compression === 0 ? compressed : null;
      if (!xml) throw new Error('El DOCX usa un método de compresión no compatible.');
      return decodeXml(
        xml
          .toString('utf8')
          .replace(/<w:tab[^>]*\/>/g, '\t')
          .replace(/<w:br[^>]*\/>/g, '\n')
          .replace(/<\/w:p>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim(),
      );
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error('El DOCX no contiene word/document.xml.');
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractPdfPages } = await import('../../lib/disciplinaryPdfAnalysis.js');
  return (await extractPdfPages(new Uint8Array(buffer))).join('\n\n');
}

export interface CaseDocumentExtract {
  name: string;
  text?: string;
  reason?: string;
}

export interface CaseDocumentExtractionOptions {
  maxDocuments?: number;
  maxExtractedCharsPerDocument?: number;
  maxExtractedCharsTotal?: number;
  deadlineMs?: number;
}

/** Extrae solo PDF y DOCX vinculados explícitamente al expediente solicitado. */
export async function extractCaseDocuments(
  documentValues: string[],
  authReq: AuthenticatedRequest,
  options: CaseDocumentExtractionOptions = {},
): Promise<CaseDocumentExtract[]> {
  const maxDocuments = options.maxDocuments ?? MAX_DOCUMENTS;
  const maxCharsPerDocument =
    options.maxExtractedCharsPerDocument ?? MAX_EXTRACTED_CHARS_PER_DOCUMENT;
  const deadlineAt = Date.now() + (options.deadlineMs ?? 8_000);
  const uniquePaths = [
    ...new Set(
      documentValues.map(normalizeStoragePath).filter((value): value is string => Boolean(value)),
    ),
  ].slice(0, maxDocuments);
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
  let remaining = options.maxExtractedCharsTotal ?? MAX_EXTRACTED_CHARS_TOTAL;
  const results: CaseDocumentExtract[] = [];

  for (const storagePath of uniquePaths) {
    if (Date.now() >= deadlineAt) {
      results.push({
        name: 'Antecedentes restantes',
        reason: 'La extracción se limitó para proteger el tiempo de respuesta.',
      });
      break;
    }
    const name = fileName(storagePath);
    const extension = name.split('.').at(-1)?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') {
      results.push({
        name,
        reason: 'Formato identificado, sin extracción de texto en esta versión.',
      });
      continue;
    }
    try {
      const downloaded = await httpsGetBuffer(
        getSupabaseHostname(),
        storagePathname(storagePath),
        { apikey: anonKey, Authorization: `Bearer ${authReq.authToken}` },
        10 * 1024 * 1024,
        Math.max(1_000, Math.min(5_000, deadlineAt - Date.now())),
      );
      if (downloaded.status < 200 || downloaded.status >= 300) {
        results.push({ name, reason: 'Archivo no disponible con los permisos actuales.' });
        continue;
      }
      const rawText =
        extension === 'pdf'
          ? await extractPdfText(downloaded.body)
          : extractDocxText(downloaded.body);
      const text = rawText
        .replaceAll(String.fromCharCode(0), '')
        .trim()
        .slice(0, Math.min(maxCharsPerDocument, remaining));
      remaining -= text.length;
      results.push(
        text ? { name, text } : { name, reason: 'El archivo no contiene texto extraíble.' },
      );
      if (remaining <= 0) break;
    } catch {
      results.push({ name, reason: 'No fue posible extraer texto del archivo.' });
    }
  }
  return results;
}
