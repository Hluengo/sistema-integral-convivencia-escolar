/** @license SPDX-License-Identifier: Apache-2.0 */

import { httpsPost } from '../lib/https.js';

// Usar un identificador estable evita cambios de latencia/comportamiento propios
// del alias "latest" en un flujo legal sensible.
const GEMINI_MODEL = process.env.LEGAL_DRAFT_MODEL || 'gemini-2.5-flash';

interface GeminiLegalDraftOptions {
  maxOutputTokens?: number;
  timeoutMs?: number;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY no configurada');
  }
  return key;
}

function collectText(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (!value || typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') return [record.text];
  return Object.values(record).flatMap(collectText);
}

export async function callGeminiComplexGeneration(
  systemInstruction: string,
  userContent: string,
  options: GeminiLegalDraftOptions = {},
): Promise<string> {
  const maxOutputTokens = options.maxOutputTokens ?? 6000;
  const timeoutMs = options.timeoutMs ?? 25_000;
  const response = await httpsPost(
    'generativelanguage.googleapis.com',
    `/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens,
      },
    },
    { 'x-goog-api-key': getApiKey() },
    timeoutMs,
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Gemini error: ${response.status} ${JSON.stringify(response.body)}`);
  }

  const body = response.body as Record<string, unknown>;
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const text = collectText(candidates).join('\n').trim();
  if (!text) throw new Error('Gemini no devolvió contenido de texto.');
  return text;
}

/**
 * Genera documentos oficiales en una solicitud independiente. El dossier no
 * se reutiliza como conversación dentro de la aplicación.
 */
export async function callGeminiLegalDraft(
  systemInstruction: string,
  dossier: string,
  options: GeminiLegalDraftOptions = {},
): Promise<string> {
  return callGeminiComplexGeneration(systemInstruction, dossier, options);
}
