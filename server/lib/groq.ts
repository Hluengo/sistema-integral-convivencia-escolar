/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const GROQ_MODEL = 'llama-3.1-8b-instant';

export async function callGroq(
  messages: { role: string; content: string }[],
  systemInstruction?: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('La variable de entorno GROQ_API_KEY es requerida.');
  }
  const body: Record<string, unknown> = { model: GROQ_MODEL, messages: [] };
  if (systemInstruction) {
    (body.messages as { role: string; content: string }[]).push({
      role: 'system',
      content: systemInstruction,
    });
  }
  (body.messages as { role: string; content: string }[]).push(...messages);
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    let groqMsg = errText;
    try {
      const errJson = JSON.parse(errText);
      groqMsg = errJson.error?.message || errText;
    } catch { /* not JSON */ }
    throw new Error(`Groq API error (${response.status}): ${groqMsg}`);
  }
  const data = (await response.json()) as Record<string, unknown>;
  const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content || '';
}
