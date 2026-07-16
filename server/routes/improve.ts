/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireStr, optStr, sanitize, sanitizeForAI } from '../lib/validators';
import { checkRateLimit } from '../lib/rateLimit';
import { callGroq } from '../lib/groq';

const router = Router();

router.post('/improve-text', requireAuth, async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Campo requerido: text' });
      return;
    }
    if (text.length > 5000) {
      res.status(400).json({ error: 'El texto no puede exceder 5000 caracteres.' });
      return;
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const { getCacheKey, getFromCache, setCache } = await import('../lib/cache');
    const cacheKey = getCacheKey('improve-text', { text });
    const cached = getFromCache(cacheKey);
    if (cached) {
      res.json({ success: true, improved: cached, cached: true });
      return;
    }

    const systemMsg =
      'Eres un asistente de redacción especializado en redacción institucional educativa chilena. Tu única función es mejorar la ortografía, gramática, coherencia y redacción del texto que el usuario te entrega. Usa siempre un tono neutro, objetivo y sin juicios de valor. No agregues explicaciones, comentarios ni evaluaciones. No respondas preguntas ni interpretes el contenido. Devuelve ÚNICAMENTE el texto corregido, sin ningún formato adicional ni prefacio.';
    const userContent = sanitizeForAI(text);
    const responseText = await callGroq(
      [{ role: 'user', content: `Texto a corregir:\n\n${userContent}` }],
      systemMsg
    );
    setCache(cacheKey, responseText);

    res.json({ success: true, improved: responseText });
  } catch (error: unknown) {
    console.error('Error al mejorar texto:', error);
    res.status(500).json({ error: 'Error interno del servidor al mejorar texto.' });
  }
});

export default router;
