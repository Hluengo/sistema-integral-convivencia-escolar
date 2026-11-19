/** @license SPDX-License-Identifier: Apache-2.0 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const assetsDir = path.resolve("dist/assets");
const indexPath = path.resolve("dist/index.html");
const maxLargestJsBytes = 650 * 1024;
const maxTotalJsBytes = 3 * 1024 * 1024;
const maxInitialJsBytes = 950 * 1024;
// Chunks que solo deben descargarse al usar su función: si aparecen
// precargados en index.html, algo los volvió dependencia del arranque.
const lazyOnlyChunkPrefixes = [
  "pdf-",
  "PdfDocumentViewer-",
  "docx-viewer-",
  "DocxDocumentViewer-",
  "excel-",
  "telemetry-sentry-",
  "telemetry-posthog-",
];

const files = (await readdir(assetsDir)).filter((file) => file.endsWith(".js"));
if (files.length === 0)
  throw new Error("No se encontraron bundles JavaScript en dist/assets.");
const sizes = await Promise.all(
  files.map(async (file) => ({
    file,
    bytes: (await stat(path.join(assetsDir, file))).size,
  })),
);
const bytesByName = new Map(sizes.map((item) => [item.file, item.bytes]));
const largest = sizes.reduce((current, item) =>
  item.bytes > current.bytes ? item : current,
);
const total = sizes.reduce((sum, item) => sum + item.bytes, 0);

const html = await readFile(indexPath, "utf8");
const entryFile = /<script[^>]+src="\/assets\/([^"]+\.js)"/.exec(html)?.[1];
if (!entryFile)
  throw new Error("No se encontró el script de entrada en dist/index.html.");
const preloaded = [
  ...html.matchAll(/<link rel="modulepreload"[^>]+href="\/assets\/([^"]+)"/g),
].map((match) => match[1]);
const initialFiles = [entryFile, ...preloaded];
const initialBytes = initialFiles.reduce((sum, file) => {
  const bytes = bytesByName.get(file);
  if (bytes === undefined)
    throw new Error(`index.html referencia un archivo inexistente: ${file}.`);
  return sum + bytes;
}, 0);

const eagerlyLoadedLazyChunks = initialFiles.filter((file) =>
  lazyOnlyChunkPrefixes.some((prefix) => file.startsWith(prefix)),
);

if (largest.bytes > maxLargestJsBytes)
  throw new Error(
    `Bundle individual excede 650 KiB: ${largest.file} (${largest.bytes} bytes).`,
  );
if (total > maxTotalJsBytes)
  throw new Error(`Bundle JavaScript total excede 3 MiB: ${total} bytes.`);
if (initialBytes > maxInitialJsBytes)
  throw new Error(
    `Carga inicial excede 950 KiB: ${initialBytes} bytes (${initialFiles.join(", ")}).`,
  );
if (eagerlyLoadedLazyChunks.length > 0)
  throw new Error(
    `index.html precarga chunks diferidos: ${eagerlyLoadedLazyChunks.join(", ")}.`,
  );

console.log(
  JSON.stringify({
    ok: true,
    files: sizes.length,
    largest,
    totalBytes: total,
    initialBytes,
    initialFiles: initialFiles.length,
    limits: { maxLargestJsBytes, maxTotalJsBytes, maxInitialJsBytes },
  }),
);
