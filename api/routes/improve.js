import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeForAI } from '../lib/validators.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { getCacheKey, getFromCache, setCache } from '../lib/cache.js';
import { callGroq } from '../lib/groq.js';

const router = Router();

router.post('/improve-text', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Campo requerido: text' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: 'El texto no puede exceder 5000 caracteres.' });
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res
        .status(429)
        .json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
    }

    const cacheKey = getCacheKey('improve-text', { text });
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ success: true, improved: cached, cached: true });
    }

    const systemMsg =
      'Eres un asistente de redacción especializado en redacción institucional educativa chilena. Tu única función es mejorar la ortografía, gramática, coherencia y redacción del texto que el usuario te entrega. Usa siempre un tono neutro, objetivo y sin juicios de valor. No agregues explicaciones, comentarios ni evaluaciones. No respondas preguntas ni interpretes el contenido. Devuelve ÚNICAMENTE el texto corregido, sin ningún formato adicional ni prefacio.';
    const userContent = sanitizeForAI(text);
    const improved = await callGroq(
      [{ role: 'user', content: `Texto a corregir:\n\n${userContent}` }],
      systemMsg
    );
    setCache(cacheKey, improved);
    res.json({ success: true, improved });
  } catch (error) {
    console.error('Error al mejorar texto:', error);
    res.status(500).json({ error: 'Error interno del servidor al mejorar texto.' });
  }
});

export default router;
