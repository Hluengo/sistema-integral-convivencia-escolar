/** @license SPDX-License-Identifier: Apache-2.0 */

import { httpsPost } from '../lib/https.js';

const AI_MODEL = 'meta-llama/llama-3.1-8b-instruct';

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
): Promise<string> {
  const apiKey = getApiKey();
  const body: { model: string; max_tokens: number; temperature: number; messages: Array<{ role: string; content: string }> } = {
    model: AI_MODEL,
    max_tokens: 4000,
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
  const content = (choices?.[0]?.message as Record<string, unknown>)?.content as
    | string
    | undefined;
  return content || '';
}
