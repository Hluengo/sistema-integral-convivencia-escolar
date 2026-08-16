/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import type { AuthenticatedRequest } from '../../types.js';

interface DownloadCall {
  hostname: string;
  pathname: string;
  headers?: Record<string, string>;
  maxBytes?: number;
  timeoutMs?: number;
}

let nextDownload: () => { status: number; body: Buffer } = () => ({
  status: 404,
  body: Buffer.from(''),
});
let nextPdfPages: () => string[] = () => ['Página uno', 'Página dos'];
let capturedDownloads: DownloadCall[] = [];

await mock.module('../lib/https.js', {
  namedExports: {
    httpsGetBuffer: async (
      hostname: string,
      pathname: string,
      headers?: Record<string, string>,
      maxBytes?: number,
      timeoutMs?: number,
    ) => {
      capturedDownloads.push({ hostname, pathname, headers, maxBytes, timeoutMs });
      return nextDownload();
    },
  },
});

// El import dinámico de pdfjs dentro de caseDocuments se resuelve a este stub.
await mock.module('../../lib/disciplinaryPdfAnalysis.js', {
  namedExports: {
    extractPdfPages: async () => nextPdfPages(),
  },
});

const { extractCaseDocuments } = await import('./caseDocuments.js');

const AUTH_REQ = {
  authToken: 'token-de-usuario',
} as unknown as AuthenticatedRequest;

function makePdfBuffer(text: string): Buffer {
  return Buffer.from(`%PDF-1.4 ${text}`);
}

function makeDocxBuffer(xml: string): Buffer {
  // Construye un ZIP mínimo con word/document.xml (método 0, sin compresión).
  const content = Buffer.from(xml, 'utf8');
  const fileName = Buffer.from('word/document.xml', 'utf8');
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt32LE(0, 10);
  localHeader.writeUInt32LE(content.length, 14);
  localHeader.writeUInt32LE(content.length, 18);
  localHeader.writeUInt16LE(fileName.length, 26);
  localHeader.writeUInt16LE(0, 28);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0, 8);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt32LE(0, 12);
  centralHeader.writeUInt32LE(content.length, 16);
  centralHeader.writeUInt32LE(content.length, 20);
  centralHeader.writeUInt16LE(fileName.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(0, 42);

  const centralOffset = 30 + fileName.length + content.length;
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(1, 8);
  endRecord.writeUInt16LE(1, 10);
  endRecord.writeUInt32LE(46 + fileName.length, 12);
  endRecord.writeUInt32LE(centralOffset, 16);
  endRecord.writeUInt16LE(0, 20);
  return Buffer.concat([localHeader, fileName, content, centralHeader, fileName, endRecord]);
}

test('extrae PDF vinculado y normaliza la ruta de storage', async () => {
  capturedDownloads = [];
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  nextDownload = () => ({ status: 200, body: makePdfBuffer('texto') });
  nextPdfPages = () => ['Página uno', 'Página dos'];

  const result = await extractCaseDocuments(
    [' /storage/v1/object/authenticated/documentos_convivencia/tenant/expediente.pdf '],
    AUTH_REQ,
  );

  assert.equal(result.length, 1);
  assert.equal(result[0]?.name, 'expediente.pdf');
  assert.match(result[0]?.text ?? '', /Página uno/);
  assert.equal(capturedDownloads[0]?.headers?.apikey, 'anon-key');
  assert.equal(capturedDownloads[0]?.headers?.Authorization, 'Bearer token-de-usuario');
  assert.match(
    capturedDownloads[0]?.pathname ?? '',
    /^\/storage\/v1\/object\/authenticated\/documentos_convivencia\//,
  );
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
});

test('extrae DOCX y decodifica entidades XML y párrafos', async () => {
  capturedDownloads = [];
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  const xml =
    '<w:document><w:p>Primer párrafo &amp; cierre</w:p><w:p>Segundo párrafo</w:p></w:document>';
  nextDownload = () => ({ status: 200, body: makeDocxBuffer(xml) });

  const result = await extractCaseDocuments(
    ['documentos_convivencia/tenant/expediente.docx'],
    AUTH_REQ,
  );

  assert.equal(result.length, 1);
  assert.match(result[0]?.text ?? '', /Primer párrafo & cierre/);
  assert.match(result[0]?.text ?? '', /Segundo párrafo/);
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
});

test('descarta formatos no soportados sin descargar', async () => {
  capturedDownloads = [];
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';

  const result = await extractCaseDocuments(['tenant/expediente.txt'], AUTH_REQ);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.reason, 'Formato identificado, sin extracción de texto en esta versión.');
  assert.equal(capturedDownloads.length, 0);
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
});

test('reporta archivo no disponible con permisos actuales', async () => {
  capturedDownloads = [];
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  nextDownload = () => ({ status: 403, body: Buffer.from('') });

  const result = await extractCaseDocuments(['tenant/expediente.pdf'], AUTH_REQ);

  assert.equal(result[0]?.reason, 'Archivo no disponible con los permisos actuales.');
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
});

test('reporta PDF sin texto extraíble', async () => {
  capturedDownloads = [];
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  nextPdfPages = () => [];
  nextDownload = () => ({ status: 200, body: makePdfBuffer('') });

  const result = await extractCaseDocuments(['tenant/expediente.pdf'], AUTH_REQ);

  assert.equal(result[0]?.reason, 'El archivo no contiene texto extraíble.');
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
});

test('limita documentos y respeta máximo de caracteres', async () => {
  capturedDownloads = [];
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  nextPdfPages = () => ['Texto largo de prueba'];
  nextDownload = () => ({ status: 200, body: makePdfBuffer('x') });

  const result = await extractCaseDocuments(
    ['tenant/a.pdf', 'tenant/b.pdf', 'tenant/c.pdf'],
    AUTH_REQ,
    { maxDocuments: 2, maxExtractedCharsTotal: 10, maxExtractedCharsPerDocument: 5 },
  );

  assert.equal(result.length, 2);
  assert.equal(capturedDownloads.length, 2);
  assert.ok(result.every((item) => (item.text?.length ?? 0) <= 5));
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
});

test('captura error de descarga como no fue posible extraer', async () => {
  capturedDownloads = [];
  process.env.VITE_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  nextDownload = () => {
    throw new Error('red caída');
  };

  const result = await extractCaseDocuments(['tenant/expediente.pdf'], AUTH_REQ);

  assert.equal(result[0]?.reason, 'No fue posible extraer texto del archivo.');
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_ANON_KEY;
});

test('reporta fallo de extracción cuando Supabase no está configurado', async () => {
  capturedDownloads = [];
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_URL;

  const result = await extractCaseDocuments(['tenant/expediente.pdf'], AUTH_REQ);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.reason, 'No fue posible extraer texto del archivo.');
});
