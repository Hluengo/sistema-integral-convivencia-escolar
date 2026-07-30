/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeForAI } from '../validators/sanitizers.js';
import { checkRateLimitAsync } from '../services/rateLimit.js';
import { getCacheKey, getFromCache, setCache } from '../services/cache.js';
import { callGroq } from '../services/groq.js';
import { getRelevantLegalSources } from '../services/legalSources.js';

const router = Router();

router.post('/advisor-chat', requireAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Campo requerido: message' });
      return;
    }

    const MAX_ADVISOR_MESSAGE_LENGTH = 8_000;
    if (message.length > MAX_ADVISOR_MESSAGE_LENGTH) {
      res.status(400).json({ error: 'El mensaje supera el máximo permitido.' });
      return;
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!(await checkRateLimitAsync(ip))) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const legalSources = await getRelevantLegalSources(message);
    const systemInstruction = `Eres el Consultor Legal de Convivencia Escolar de un establecimiento chileno.

Responde únicamente desde las FUENTES JURÍDICAS AUTORIZADAS incluidas abajo. Estas fuentes pueden contener normativa educacional, derechos de niños, niñas y adolescentes, circulares, resoluciones de la Superintendencia y reglamentos o protocolos institucionales vigentes que el establecimiento haya versionado.

REGLAS:
- No uses conocimiento jurídico externo ni presentes como vigente una norma que no aparezca en las fuentes autorizadas.
- Cita el nombre del archivo y, cuando esté disponible, artículo, sección o numeral. Si el corpus no permite responder o verificar vigencia, dilo expresamente y solicita incorporar la fuente oficial correspondiente a docs/leyes.
- Distingue entre norma jurídica, instrucción administrativa, reglamento/protocolo institucional y recomendación preventiva.
- No inventes plazos, sanciones, artículos, obligaciones ni hechos. No sustituyas la revisión profesional de un caso concreto.
- Redacta en español formal de Chile, con estructura clara, tono neutral y enfoque de derechos, convivencia escolar y debido proceso.

FUENTES JURÍDICAS AUTORIZADAS:
${legalSources}`;

    const userId = (req as unknown as { user?: { sub?: string } }).user?.sub || 'anonymous';
    const cacheKey = getCacheKey('advisor-chat', {
      userId,
      message,
      historyCount: (history as Array<unknown>)?.length || 0,
    });
    const cached = getFromCache(cacheKey);
    if (cached) {
      res.json({ success: true, reply: cached, cached: true });
      return;
    }

    const messages: Array<{ role: string; content: string }> = [];
    if (history && Array.isArray(history)) {
      (history as Array<{ role: string; content: string }>).forEach((h) => {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: sanitizeForAI(h.content),
        });
      });
    }
    messages.push({ role: 'user', content: sanitizeForAI(message) });
    const reply = await callGroq(messages, systemInstruction);
    setCache(cacheKey, reply);
    res.json({ success: true, reply });
  } catch (error) {
    console.error('Error en el Chat de Consultoría:', (error as Error).message || error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

export default router;
