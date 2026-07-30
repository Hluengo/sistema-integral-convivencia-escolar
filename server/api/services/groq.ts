/** @license SPDX-License-Identifier: Apache-2.0 */

import { httpsPost } from '../lib/https.js';

const AI_MODEL = process.env.TEXT_AI_MODEL || 'meta-llama/llama-3.1-8b-instruct';
const TEXT_FALLBACK_MODELS = [
  'google/gemma-4-31b-it:free',
  'deepseek/deepseek-v4-flash:free',
] as const;

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OPENROUTER_API_KEY no configurada');
  }
  return key;
}

export async function callGroq(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
  model = AI_MODEL,
): Promise<string> {
  const apiKey = getApiKey();
  const body: {
    model: string;
    max_tokens: number;
    temperature: number;
    messages: Array<{ role: string; content: string }>;
  } = {
    model,
    max_tokens: 2000,
    temperature: 0,
    messages: [],
  };
  if (systemInstruction) {
    body.messages.push({ role: 'system', content: systemInstruction });
  }
  body.messages.push(...messages);
  const res = await httpsPost('openrouter.ai', '/api/v1/chat/completions', body, {
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': 'http://localhost:3001',
    'X-Title': 'Sistema Integral Convivencia Escolar',
  });
  if (res.status !== 200) {
    throw new Error(`OpenRouter error: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const resBody = res.body as Record<string, unknown>;
  const choices = resBody?.choices as Array<Record<string, unknown>> | undefined;
  const content = (choices?.[0]?.message as Record<string, unknown>)?.content as string | undefined;
  return content || '';
}

/** Respaldo para transformaciones editoriales breves; no se usa para informes oficiales. */
export async function callTextImprovementFallback(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
): Promise<string> {
  let lastError: unknown;
  for (const model of TEXT_FALLBACK_MODELS) {
    try {
      const text = await callGroq(messages, systemInstruction, model);
      if (text.trim()) return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('No fue posible usar un modelo de respaldo.');
}
