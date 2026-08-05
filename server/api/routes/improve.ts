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
      let improved: string;
      try {
        improved = await callOpenRouter(
          request,
          TEXT_IMPROVEMENT_SYSTEM_PROMPT,
          TEXT_IMPROVEMENT_AI_MODEL,
        );
      } catch {
        improved = await callTextImprovementFallback(request, TEXT_IMPROVEMENT_SYSTEM_PROMPT, [
          TEXT_IMPROVEMENT_AI_MODEL,
        ]);
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
        try {
          improved = await callOpenRouter(
            retryRequest,
            TEXT_IMPROVEMENT_SYSTEM_PROMPT,
            TEXT_IMPROVEMENT_AI_MODEL,
          );
        } catch {
          improved = await callTextImprovementFallback(
            retryRequest,
            TEXT_IMPROVEMENT_SYSTEM_PROMPT,
            [TEXT_IMPROVEMENT_AI_MODEL],
          );
        }
      }
      if (
        isTextImprovementRefusal(improved) ||
        isTextImprovementTooSimilar(userContent, improved)
      ) {
        try {
          improved = await callTextImprovementFallback(request, TEXT_IMPROVEMENT_SYSTEM_PROMPT, [
            TEXT_IMPROVEMENT_AI_MODEL,
          ]);
        } catch {
          res.json(buildTextImprovementUnchangedResponse(text));
          return;
        }
        if (
          isTextImprovementRefusal(improved) ||
          isTextImprovementTooSimilar(userContent, improved)
        ) {
          res.json(buildTextImprovementUnchangedResponse(text));
          return;
        }
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
