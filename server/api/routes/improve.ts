/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { redactSensitiveForAI } from '../validators/sanitizers.js';
import { getCacheKey, getFromCache, setCache } from '../services/cache.js';
import {
  callOpenRouter,
  callTextImprovementFallback,
  TEXT_IMPROVEMENT_AI_MODEL,
} from '../services/openrouter.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireMembership, CONVIVENCIA_MEMBERSHIP } from '../../middleware/requireMembership.js';
import {
  buildTextImprovementUnchangedResponse,
  buildTextImprovementRequest,
  isTextImprovementTooSimilar,
  isTextImprovementRefusal,
  isTextImprovementProviderTimeout,
  TEXT_IMPROVEMENT_TIMEOUT_WARNING,
  TEXT_IMPROVEMENT_SYSTEM_PROMPT,
} from '../services/textImprovement.js';

const router = Router();

const IMPROVEMENT_CONTEXTS = {
  relato_causa:
    'Redacta como relato inicial de hechos para un expediente de convivencia escolar. Ordena cronológicamente lo informado, deja claro qué se observó o denunció, y conserva una formulación objetiva, sin calificar hechos no probados.',
  observaciones_causa:
    'Redacta como observaciones internas de un expediente de convivencia escolar. Prioriza claridad administrativa, trazabilidad del caso y lenguaje formal, sin transformar las observaciones en una resolución.',
  hito_observacion:
    'Redacta como observación de un hito del debido proceso. Debe quedar claro qué actuación se realizó, por quién, con qué respaldo y qué queda pendiente si el usuario lo mencionó.',
  bitacora_manual:
    'Redacta como entrada manual de bitácora institucional. Organiza el hecho, acuerdo, entrevista o seguimiento en un párrafo claro y trazable, sin agregar decisiones que el usuario no haya informado.',
  cierre_causa:
    'Redacta el texto como fundamento institucional de un cierre anticipado de causa. Ordena con claridad los antecedentes aportados, el resultado de la investigación y la razón por la que no corresponde continuar. Conserva estrictamente los hechos, acciones, fechas, personas y conclusión entregados por el usuario. No inventes antecedentes, pruebas, citas normativas, responsabilidades ni sanciones, y no cambies la decisión descrita.',
} as const;

const TEXT_IMPROVEMENT_PROMPT_VERSION = '2026-08-05-v2';
const TEXT_IMPROVEMENT_PRIMARY_TIMEOUT_MS = 7_000;
const TEXT_IMPROVEMENT_FALLBACK_TIMEOUT_MS = 6_000;
const TEXT_IMPROVEMENT_FALLBACK_MAX_MODELS = 2;
const TEXT_IMPROVEMENT_MAX_TOKENS = 1_200;

async function generateImprovement(
  request: Array<{ role: string; content: string }>,
  allowFallback: boolean,
): Promise<{ text: string | null; timedOut: boolean }> {
  try {
    const text = await callOpenRouter(
      request,
      TEXT_IMPROVEMENT_SYSTEM_PROMPT,
      TEXT_IMPROVEMENT_AI_MODEL,
      { timeoutMs: TEXT_IMPROVEMENT_PRIMARY_TIMEOUT_MS, maxTokens: TEXT_IMPROVEMENT_MAX_TOKENS },
    );
    return { text, timedOut: false };
  } catch (error) {
    if (isTextImprovementProviderTimeout(error) || !allowFallback) {
      return { text: null, timedOut: isTextImprovementProviderTimeout(error) };
    }
    try {
      const text = await callTextImprovementFallback(
        request,
        TEXT_IMPROVEMENT_SYSTEM_PROMPT,
        [TEXT_IMPROVEMENT_AI_MODEL],
        {
          timeoutMs: TEXT_IMPROVEMENT_FALLBACK_TIMEOUT_MS,
          maxTokens: TEXT_IMPROVEMENT_MAX_TOKENS,
          maxModels: TEXT_IMPROVEMENT_FALLBACK_MAX_MODELS,
        },
      );
      return { text, timedOut: false };
    } catch (fallbackError) {
      return {
        text: null,
        timedOut: isTextImprovementProviderTimeout(fallbackError),
      };
    }
  }
}

function isUsableImprovement(originalText: string, improvedText: string | null): boolean {
  return Boolean(
    improvedText &&
    !isTextImprovementRefusal(improvedText) &&
    !isTextImprovementTooSimilar(originalText, improvedText),
  );
}

async function generateFallbackImprovement(
  request: Array<{ role: string; content: string }>,
): Promise<{ text: string | null; timedOut: boolean }> {
  try {
    const text = await callTextImprovementFallback(
      request,
      TEXT_IMPROVEMENT_SYSTEM_PROMPT,
      [TEXT_IMPROVEMENT_AI_MODEL],
      {
        timeoutMs: TEXT_IMPROVEMENT_FALLBACK_TIMEOUT_MS,
        maxTokens: TEXT_IMPROVEMENT_MAX_TOKENS,
        maxModels: TEXT_IMPROVEMENT_FALLBACK_MAX_MODELS,
      },
    );
    return { text, timedOut: false };
  } catch (error) {
    return { text: null, timedOut: isTextImprovementProviderTimeout(error) };
  }
}

router.post(
  '/improve-text',
  requireAuth,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  rateLimit,
  async (req, res) => {
    try {
      const { text, context } = req.body;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({ error: 'Campo requerido: text' });
        return;
      }
      if (text.length > 5000) {
        res.status(400).json({ error: 'El texto no puede exceder 5000 caracteres.' });
        return;
      }
      if (context !== undefined && !(context in IMPROVEMENT_CONTEXTS)) {
        res.status(400).json({ error: 'Contexto de mejora no válido.' });
        return;
      }

      const userContent = redactSensitiveForAI(text);
      const cacheKey = getCacheKey('improve-text', {
        text: userContent,
        context,
        model: TEXT_IMPROVEMENT_AI_MODEL,
        promptVersion: TEXT_IMPROVEMENT_PROMPT_VERSION,
      });
      const cached = getFromCache(cacheKey);
      if (cached) {
        res.json({ success: true, improved: cached, cached: true });
        return;
      }
      const contextInstruction =
        context && context in IMPROVEMENT_CONTEXTS
          ? IMPROVEMENT_CONTEXTS[context as keyof typeof IMPROVEMENT_CONTEXTS]
          : undefined;
      const request = [
        {
          role: 'user',
          content: buildTextImprovementRequest(userContent, contextInstruction),
        },
      ];
      let result = await generateImprovement(request, true);
      let improved = result.text;
      if (!improved) {
        res.json(
          buildTextImprovementUnchangedResponse(
            text,
            result.timedOut ? TEXT_IMPROVEMENT_TIMEOUT_WARNING : undefined,
          ),
        );
        return;
      }
      if (
        isTextImprovementRefusal(improved) ||
        isTextImprovementTooSimilar(userContent, improved)
      ) {
        const retryRequest = [
          {
            role: 'user',
            content: buildTextImprovementRequest(userContent, contextInstruction, true),
          },
        ];
        result = await generateImprovement(retryRequest, false);
        improved = result.text;
        if (!isUsableImprovement(userContent, improved)) {
          const fallbackResult = await generateFallbackImprovement(retryRequest);
          if (fallbackResult.text) {
            result = fallbackResult;
            improved = fallbackResult.text;
          } else if (fallbackResult.timedOut) {
            result = fallbackResult;
          }
        }
      }
      if (
        !improved ||
        isTextImprovementRefusal(improved) ||
        isTextImprovementTooSimilar(userContent, improved)
      ) {
        console.warn('[improve-text] no usable improvement returned', {
          context: context || 'default',
          timedOut: result.timedOut,
          primaryModel: TEXT_IMPROVEMENT_AI_MODEL,
        });
        res.json(
          buildTextImprovementUnchangedResponse(
            text,
            result.timedOut ? TEXT_IMPROVEMENT_TIMEOUT_WARNING : undefined,
          ),
        );
        return;
      }
      setCache(cacheKey, improved);
      res.json({
        success: true,
        improved,
        provider: 'OpenRouter',
        model: TEXT_IMPROVEMENT_AI_MODEL,
      });
    } catch (error) {
      console.error('Error al mejorar texto:', error);
      res.status(500).json({ error: 'Error interno del servidor al mejorar texto.' });
    }
  },
);

export default router;
