/** @license SPDX-License-Identifier: Apache-2.0 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const LEGAL_SOURCES_DIRECTORY = path.join(process.cwd(), 'docs', 'leyes');
interface LegalSource {
  name: string;
  text: string;
}

let cachedSources: Promise<LegalSource[]> | null = null;

const STOP_WORDS = new Set([
  'ante',
  'bajo',
  'cada',
  'como',
  'con',
  'contra',
  'cual',
  'cuales',
  'cuando',
  'debe',
  'desde',
  'donde',
  'entre',
  'esta',
  'este',
  'estos',
  'haber',
  'hasta',
  'legal',
  'leyes',
  'para',
  'pero',
  'por',
  'que',
  'segun',
  'sobre',
  'solo',
  'sus',
  'todo',
  'una',
  'unos',
  'uso',
  'y',
]);

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
async function loadAuthorizedLegalSources(): Promise<LegalSource[]> {
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
      return contents;
    })();
  }
  return cachedSources;
}

function searchTerms(value: string): string[] {
  return [
    ...new Set(
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('es-CL')
        .match(/[a-z0-9]{3,}/g)
        ?.filter((term) => !STOP_WORDS.has(term)) ?? [],
    ),
  ].slice(0, 30);
}

function sourceScore(source: LegalSource, terms: string[]): number {
  const haystack = `${source.name}\n${source.text}`.toLocaleLowerCase('es-CL');
  return terms.reduce((score, term) => {
    const matches = haystack.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    return score + Math.min(matches?.length ?? 0, 12);
  }, 0);
}

/**
 * Devuelve solo las fuentes más pertinentes para una consulta. El corpus se
 * carga desde disco una vez por instancia y nunca requiere llamadas a
 * Supabase; así se conserva el criterio de fuentes versionadas sin enviar
 * cientos de miles de caracteres al modelo en cada solicitud.
 */
export async function getRelevantLegalSources(query: string, maxChars = 90_000): Promise<string> {
  const sources = await loadAuthorizedLegalSources();
  const terms = searchTerms(query);
  const selected = [...sources]
    .map((source) => ({ source, score: sourceScore(source, terms) }))
    .sort(
      (left, right) =>
        right.score - left.score || left.source.name.localeCompare(right.source.name, 'es-CL'),
    );

  const relevant = selected.filter(({ score }) => score > 0);
  const candidates = (relevant.length ? relevant : selected).slice(0, 6);
  const output: string[] = [];
  const charsPerSource = Math.max(1_000, Math.floor(maxChars / candidates.length) - 120);

  for (const { source } of candidates) {
    const content = `### ${source.name}\n${source.text.slice(0, charsPerSource)}`;
    output.push(content);
  }

  if (!output.length) throw new Error('No hay fuentes jurídicas disponibles en docs/leyes.');
  return output.join('\n\n');
}

export async function getAuthorizedLegalSources(): Promise<string> {
  const sources = await loadAuthorizedLegalSources();
  return sources.map(({ name, text }) => `### ${name}\n${text}`).join('\n\n');
}
