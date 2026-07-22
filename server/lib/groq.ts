/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const AI_MODEL = 'meta-llama/llama-3.1-8b-instruct';

export async function callGroq(
  messages: { role: string; content: string }[],
  systemInstruction?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('La variable de entorno OPENROUTER_API_KEY es requerida.');
  }
  const body: Record<string, unknown> = { model: AI_MODEL, messages: [] };
  if (systemInstruction) {
    (body.messages as { role: string; content: string }[]).push({
      role: 'system',
      content: systemInstruction,
    });
  }
  (body.messages as { role: string; content: string }[]).push(...messages);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Sistema Integral Convivencia Escolar',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    let aiMsg = errText;
    try {
      const errJson = JSON.parse(errText);
      aiMsg = errJson.error?.message || errText;
    } catch { /* not JSON */ }
    throw new Error(`OpenRouter error (${response.status}): ${aiMsg}`);
  }
  const data = (await response.json()) as Record<string, unknown>;
  const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content || '';
}
