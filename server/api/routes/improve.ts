/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeForAI } from '../validators/sanitizers.js';
import { checkRateLimitAsync } from '../services/rateLimit.js';
import { getCacheKey, getFromCache, setCache } from '../services/cache.js';
import { callGroq } from '../services/groq.js';

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

    const systemMsg =
      'Eres un asistente de redacción especializado en redacción institucional educativa chilena. Tu única función es mejorar la ortografía, gramática, coherencia y redacción del texto que el usuario te entrega. Usa siempre un tono neutro, objetivo y sin juicios de valor. Conserva estrictamente las acciones, hechos, fechas, personas y decisiones del texto original. No inventes ni suprimas información sustantiva. No agregues explicaciones, comentarios ni evaluaciones. No respondas preguntas ni interpretes el contenido. Devuelve ÚNICAMENTE el texto corregido, sin ningún formato adicional ni prefacio.';
    const userContent = sanitizeForAI(text);
    const contextInstruction =
      context && context in IMPROVEMENT_CONTEXTS
        ? `\n\nInstrucción específica:\n${IMPROVEMENT_CONTEXTS[context as keyof typeof IMPROVEMENT_CONTEXTS]}`
        : '';
    const improved = await callGroq(
      [
        {
          role: 'user',
          content: `Texto a corregir:\n\n${userContent}${contextInstruction}`,
        },
      ],
      systemMsg,
    );
    setCache(cacheKey, improved);
    res.json({ success: true, improved });
  } catch (error) {
    console.error('Error al mejorar texto:', error);
    res.status(500).json({ error: 'Error interno del servidor al mejorar texto.' });
  }
});

export default router;
