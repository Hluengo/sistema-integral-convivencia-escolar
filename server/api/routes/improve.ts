/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { sanitizeForAI } from '../validators/sanitizers.js';
import { getCacheKey, getFromCache, setCache } from '../services/cache.js';
import { callOpenRouter, callTextImprovementFallback } from '../services/openrouter.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireMembership, CONVIVENCIA_MEMBERSHIP } from '../../middleware/requireMembership.js';
import {
  buildTextImprovementRequest,
  isTextImprovementRefusal,
  TEXT_IMPROVEMENT_SYSTEM_PROMPT,
} from '../services/textImprovement.js';

const router = Router();

const IMPROVEMENT_CONTEXTS = {
  cierre_causa:
    'Redacta el texto como fundamento institucional de un cierre anticipado de causa. Ordena con claridad los antecedentes aportados, el resultado de la investigación y la razón por la que no corresponde continuar. Conserva estrictamente los hechos, acciones, fechas, personas y conclusión entregados por el usuario. No inventes antecedentes, pruebas, citas normativas, responsabilidades ni sanciones, y no cambies la decisión descrita.',
} as const;

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

      const cacheKey = getCacheKey('improve-text', { text, context });
      const cached = getFromCache(cacheKey);
      if (cached) {
        res.json({ success: true, improved: cached, cached: true });
        return;
      }

      const userContent = sanitizeForAI(text);
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
        improved = await callOpenRouter(request, TEXT_IMPROVEMENT_SYSTEM_PROMPT);
      } catch {
        improved = await callTextImprovementFallback(request, TEXT_IMPROVEMENT_SYSTEM_PROMPT);
      }
      if (isTextImprovementRefusal(improved)) {
        const retryRequest = [
          {
            role: 'user',
            content: buildTextImprovementRequest(userContent, contextInstruction, true),
          },
        ];
        try {
          improved = await callOpenRouter(retryRequest, TEXT_IMPROVEMENT_SYSTEM_PROMPT);
        } catch {
          improved = await callTextImprovementFallback(
            retryRequest,
            TEXT_IMPROVEMENT_SYSTEM_PROMPT,
          );
        }
      }
      if (isTextImprovementRefusal(improved)) {
        try {
          improved = await callTextImprovementFallback(request, TEXT_IMPROVEMENT_SYSTEM_PROMPT);
        } catch {
          res.status(422).json({
            error:
              'La IA no pudo mejorar este texto. El contenido original se mantuvo sin cambios.',
          });
          return;
        }
        if (isTextImprovementRefusal(improved)) {
          res.status(422).json({
            error:
              'La IA no pudo mejorar este texto. El contenido original se mantuvo sin cambios.',
          });
          return;
        }
      }
      setCache(cacheKey, improved);
      res.json({ success: true, improved });
    } catch (error) {
      console.error('Error al mejorar texto:', error);
      res.status(500).json({ error: 'Error interno del servidor al mejorar texto.' });
    }
  },
);

export default router;
