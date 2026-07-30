/** @license SPDX-License-Identifier: Apache-2.0 */

import { httpsPost } from '../lib/https.js';

// El alias oficial sigue la versión Flash disponible y evita dejar el flujo
// detenido cuando Google retira un identificador estable para cuentas nuevas.
const GEMINI_MODEL = process.env.LEGAL_DRAFT_MODEL || 'gemini-flash-latest';

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

/**
 * Genera documentos oficiales en una solicitud independiente. El dossier no
 * se reutiliza como conversación dentro de la aplicación.
 */
export async function callGeminiLegalDraft(
  systemInstruction: string,
  dossier: string,
): Promise<string> {
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
          parts: [{ text: dossier }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 12000,
      },
    },
    { 'x-goog-api-key': getApiKey() },
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
