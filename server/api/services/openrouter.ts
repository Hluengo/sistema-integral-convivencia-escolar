/** @license SPDX-License-Identifier: Apache-2.0 */

import { httpsPost } from '../lib/https.js';

const AI_MODEL = process.env.TEXT_AI_MODEL || 'meta-llama/llama-3.1-8b-instruct';
export const TEXT_IMPROVEMENT_AI_MODEL =
  process.env.TEXT_IMPROVEMENT_AI_MODEL ||
  process.env.TEXT_AI_MODEL ||
  'google/gemma-4-31b-it:free';
const TEXT_FALLBACK_MODELS = [
  'deepseek/deepseek-v4-flash:free',
  'meta-llama/llama-3.1-8b-instruct',
] as const;
const LEGAL_DRAFT_OPENROUTER_MODELS = [
  process.env.LEGAL_DRAFT_OPENROUTER_MODEL ||
    process.env.TEXT_IMPROVEMENT_AI_MODEL ||
    'google/gemma-4-31b-it:free',
  'deepseek/deepseek-v4-flash:free',
  'meta-llama/llama-3.1-8b-instruct',
] as const;

interface OpenRouterOptions {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
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

/** Respaldo para borradores legales cuando Gemini no está disponible en producción. */
export async function callOpenRouterLegalDraft(
  systemInstruction: string,
  dossier: string,
  options: OpenRouterOptions = {},
): Promise<string> {
  let lastError: unknown;
  const models = [...new Set(LEGAL_DRAFT_OPENROUTER_MODELS)];
  for (const model of models) {
    try {
      const text = await callOpenRouter(
        [{ role: 'user', content: dossier }],
        systemInstruction,
        model,
        {
          maxTokens: options.maxTokens ?? 5000,
          temperature: options.temperature ?? 0.2,
          timeoutMs: options.timeoutMs ?? 35_000,
        },
      );
      if (text.trim()) return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('No fue posible usar un modelo de respaldo para el documento.');
}

/** Respaldo para transformaciones editoriales breves; no se usa para informes oficiales. */
export async function callTextImprovementFallback(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
  excludedModels: readonly string[] = [],
): Promise<string> {
  let lastError: unknown;
  const models = TEXT_FALLBACK_MODELS.filter((model) => !excludedModels.includes(model));
  for (const model of models) {
    try {
      const text = await callOpenRouter(messages, systemInstruction, model);
      if (text.trim()) return text;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('No fue posible usar un modelo de respaldo.');
}
