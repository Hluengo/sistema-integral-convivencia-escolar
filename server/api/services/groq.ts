/** @license SPDX-License-Identifier: Apache-2.0 */

import { httpsPost } from '../lib/https.js';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY no configurada');
  }
  return key;
}

export async function callGroq(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
): Promise<string> {
  const apiKey = getApiKey();
  const body: { model: string; messages: Array<{ role: string; content: string }> } = {
    model: GROQ_MODEL,
    messages: [],
  };
  if (systemInstruction) {
    body.messages.push({ role: 'system', content: systemInstruction });
  }
  body.messages.push(...messages);
  const res = await httpsPost('api.groq.com', '/openai/v1/chat/completions', body, {
    Authorization: `Bearer ${apiKey}`,
  });
  if (res.status !== 200) {
    throw new Error(`Groq API error: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const resBody = res.body as Record<string, unknown>;
  const choices = resBody?.choices as Array<Record<string, unknown>> | undefined;
  const content = (choices?.[0]?.message as Record<string, unknown>)?.content as
    | string
    | undefined;
  return content || '';
}
