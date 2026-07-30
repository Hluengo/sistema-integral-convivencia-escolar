/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeForAI } from '../validators/sanitizers.js';
import { checkRateLimitAsync } from '../services/rateLimit.js';
import { getCacheKey, getFromCache, setCache } from '../services/cache.js';
import { callGroq } from '../services/groq.js';
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

router.post('/improve-text', requireAuth, async (req, res) => {
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

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!(await checkRateLimitAsync(ip))) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
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
    let improved = await callGroq(
      [
        {
          role: 'user',
          content: buildTextImprovementRequest(userContent, contextInstruction),
        },
      ],
      TEXT_IMPROVEMENT_SYSTEM_PROMPT,
    );
    if (isTextImprovementRefusal(improved)) {
      improved = await callGroq(
        [
          {
            role: 'user',
            content: buildTextImprovementRequest(userContent, contextInstruction, true),
          },
        ],
        TEXT_IMPROVEMENT_SYSTEM_PROMPT,
      );
    }
    if (isTextImprovementRefusal(improved)) {
      res.status(422).json({
        error: 'La IA no pudo mejorar este texto. El contenido original se mantuvo sin cambios.',
      });
      return;
    }
    setCache(cacheKey, improved);
    res.json({ success: true, improved });
  } catch (error) {
    console.error('Error al mejorar texto:', error);
    res.status(500).json({ error: 'Error interno del servidor al mejorar texto.' });
  }
});

export default router;
