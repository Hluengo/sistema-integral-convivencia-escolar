/** @license SPDX-License-Identifier: Apache-2.0 */

import { httpsPost } from '../lib/https.js';

const AI_MODEL = process.env.TEXT_AI_MODEL || 'meta-llama/llama-3.1-8b-instruct';
interface OpenRouterOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  maxModels?: number;
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY no configurada');
  return key;
}

export async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
  model = AI_MODEL,
  options: OpenRouterOptions = {},
): Promise<string> {
  const body = {
    model,
    max_tokens: options.maxTokens ?? 2000,
    temperature: options.temperature ?? 0,
    messages: systemInstruction
      ? [{ role: 'system', content: systemInstruction }, ...messages]
      : messages,
  };
  const res = await httpsPost(
    'openrouter.ai',
    '/api/v1/chat/completions',
    body,
    {
      Authorization: `Bearer ${getApiKey()}`,
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Sistema Integral Convivencia Escolar',
    },
    options.timeoutMs,
  );
  if (res.status !== 200)
    throw new Error(`OpenRouter error: ${res.status} ${JSON.stringify(res.body)}`);
  const choices = (res.body as Record<string, unknown>)?.choices as
    Array<Record<string, unknown>> | undefined;
  return ((choices?.[0]?.message as Record<string, unknown>)?.content as string | undefined) || '';
}
