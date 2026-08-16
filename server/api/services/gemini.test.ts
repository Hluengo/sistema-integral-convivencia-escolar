/** @license SPDX-License-Identifier: Apache-2.0 */

import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

interface PostCall {
  hostname: string;
  pathname: string;
  body: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

let nextResponse: () => { status: number; body: unknown } = () => ({ status: 200, body: {} });
let captured: PostCall[] = [];

await mock.module('../lib/https.js', {
  namedExports: {
    httpsPost: async (
      hostname: string,
      pathname: string,
      body: unknown,
      headers?: Record<string, string>,
      timeoutMs?: number,
    ) => {
      captured.push({ hostname, pathname, body, headers, timeoutMs });
      return nextResponse();
    },
  },
});

const { callGeminiComplexGeneration, callGeminiLegalDraft, callGeminiTextImprovement } =
  await import('./gemini.js');

test('callGeminiComplexGeneration envía el cuerpo con la clave de API correcta', async () => {
  captured = [];
  process.env.GEMINI_API_KEY = 'test-key';
  nextResponse = () => ({ status: 200, body: { candidates: [{ text: 'Respuesta final' }] } });
  const result = await callGeminiComplexGeneration('Instrucción', 'Contenido');

  assert.equal(result, 'Respuesta final');
  assert.equal(captured[0]?.hostname, 'generativelanguage.googleapis.com');
  assert.match(captured[0]?.pathname ?? '', /models\/gemini-3\.6-flash:generateContent/);
  assert.equal(captured[0]?.timeoutMs, 25_000);
  assert.equal(captured[0]?.headers?.['x-goog-api-key'], 'test-key');
  const payload = captured[0]?.body as {
    systemInstruction: { parts: Array<{ text: string }> };
    contents: Array<{ parts: Array<{ text: string }> }>;
    generationConfig: { maxOutputTokens: number };
  };
  assert.equal(payload.systemInstruction.parts[0]?.text, 'Instrucción');
  assert.equal(payload.contents[0]?.parts[0]?.text, 'Contenido');
  assert.equal(payload.generationConfig.maxOutputTokens, 6000);
  delete process.env.GEMINI_API_KEY;
});

test('callGeminiComplexGeneration respeta maxOutputTokens y timeoutMs personalizados', async () => {
  captured = [];
  process.env.GEMINI_API_KEY = 'test-key';
  nextResponse = () => ({ status: 200, body: { candidates: [{ text: 'ok' }] } });
  const result = await callGeminiComplexGeneration('a', 'b', {
    maxOutputTokens: 1234,
    timeoutMs: 42_000,
  });

  assert.equal(result, 'ok');
  const payload = captured[0]?.body as { generationConfig: { maxOutputTokens: number } };
  assert.equal(payload.generationConfig.maxOutputTokens, 1234);
  assert.equal(captured[0]?.timeoutMs, 42_000);
  delete process.env.GEMINI_API_KEY;
});

test('callGeminiTextImprovement usa Gemini con límites breves y sin muestreo deprecado', async () => {
  captured = [];
  process.env.GEMINI_API_KEY = 'test-key';
  nextResponse = () => ({
    status: 200,
    body: {
      candidates: [{ content: { parts: [{ text: 'Texto corregido.' }] } }],
    },
  });
  const result = await callGeminiTextImprovement('Corrige estilo.', 'Texto fuente.');

  assert.equal(result, 'Texto corregido.');
  assert.match(captured[0]?.pathname ?? '', /models\/gemini-3\.6-flash:generateContent/);
  assert.equal(captured[0]?.timeoutMs, 7_000);
  const payload = captured[0]?.body as {
    systemInstruction: { parts: Array<{ text: string }> };
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    generationConfig: Record<string, unknown>;
  };
  assert.equal(payload.systemInstruction.parts[0]?.text, 'Corrige estilo.');
  assert.equal(payload.contents[0]?.role, 'user');
  assert.equal(payload.contents[0]?.parts[0]?.text, 'Texto fuente.');
  assert.equal(payload.generationConfig.maxOutputTokens, 1200);
  assert.equal('temperature' in payload.generationConfig, false);
  assert.equal('topP' in payload.generationConfig, false);
  assert.equal('topK' in payload.generationConfig, false);
  delete process.env.GEMINI_API_KEY;
});

test('callGeminiComplexGeneration lanza error para respuestas no 2xx', async () => {
  captured = [];
  process.env.GEMINI_API_KEY = 'test-key';
  nextResponse = () => ({ status: 429, body: { error: { message: 'rate limit' } } });
  await assert.rejects(() => callGeminiComplexGeneration('a', 'b'), /Gemini error: 429/);
  delete process.env.GEMINI_API_KEY;
});

test('callGeminiComplexGeneration lanza error cuando el texto está vacío', async () => {
  captured = [];
  process.env.GEMINI_API_KEY = 'test-key';
  nextResponse = () => ({ status: 200, body: { candidates: [] } });
  await assert.rejects(
    () => callGeminiComplexGeneration('a', 'b'),
    /no devolvió contenido de texto/,
  );
  delete process.env.GEMINI_API_KEY;
});

test('callGeminiComplexGeneration lanza error sin GEMINI_API_KEY', async () => {
  captured = [];
  delete process.env.GEMINI_API_KEY;
  nextResponse = () => ({ status: 200, body: { candidates: [{ text: 'x' }] } });
  await assert.rejects(
    () => callGeminiComplexGeneration('a', 'b'),
    /GEMINI_API_KEY no configurada/,
  );
});

test('callGeminiLegalDraft delega en la generación compleja', async () => {
  captured = [];
  process.env.GEMINI_API_KEY = 'test-key';
  nextResponse = () => ({ status: 200, body: { candidates: [{ text: 'borrador' }] } });
  const result = await callGeminiLegalDraft('Instrucción legal', 'dossier completo');

  assert.equal(result, 'borrador');
  const payload = captured[0]?.body as {
    contents: Array<{ parts: Array<{ text: string }> }>;
  };
  assert.equal(payload.contents[0]?.parts[0]?.text, 'dossier completo');
  delete process.env.GEMINI_API_KEY;
});
