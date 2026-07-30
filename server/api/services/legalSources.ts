/** @license SPDX-License-Identifier: Apache-2.0 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const LEGAL_SOURCES_DIRECTORY = path.join(process.cwd(), 'docs', 'leyes');
let cachedSources: Promise<string> | null = null;

async function listMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return listMarkdownFiles(entryPath);
      return entry.isFile() && entry.name.toLowerCase().endsWith('.md') ? [entryPath] : [];
    }),
  );
  return nested.flat().sort((left, right) => left.localeCompare(right, 'es-CL'));
}

/**
 * Carga una sola vez las fuentes legales versionadas con el proyecto. Así el
 * modelo solo puede apoyar sus referencias en documentos revisables y no se
 * agrega una lectura ni una llamada a Supabase por cada borrador.
 */
export function getAuthorizedLegalSources(): Promise<string> {
  if (!cachedSources) {
    cachedSources = (async () => {
      const files = await listMarkdownFiles(LEGAL_SOURCES_DIRECTORY);
      const contents = await Promise.all(
        files.map(async (file) => ({
          name: path.relative(LEGAL_SOURCES_DIRECTORY, file),
          text: await readFile(file, 'utf8'),
        })),
      );
      if (!contents.length) throw new Error('No hay fuentes jurídicas disponibles en docs/leyes.');
      return contents.map(({ name, text }) => `### ${name}\n${text}`).join('\n\n');
    })();
  }
  return cachedSources;
}
