/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { sanitizeForAI } from '../lib/validators';
import { checkRateLimitAsync } from '../lib/rateLimit';
import { getCacheKey, getFromCache, setCache } from '../lib/cache';
import { callGroq } from '../lib/groq';

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

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!await checkRateLimitAsync(ip)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const userObj = (req as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
    const userId = userObj?.sub || 'anonymous';
    const cacheKey = getCacheKey('advisor-chat', {
      userId,
      message,
      historyCount: history?.length || 0,
    });
    const cached = getFromCache(cacheKey);
    if (cached) {
      res.json({ success: true, reply: cached, cached: true });
      return;
    }

    const systemInstruction = `Actúas como un Abogado Senior y Experto Legal de la Superintendencia de Educación de Chile, experto en fiscalizaciones aplicadas a establecimientos escolares chilenos. Tu dominio de especialidad abarca:
- Circular N° 482 de la Superintendencia de Educación y la Ley N° 21809, que norman reglamentos internos de convivencia escolar (RIE), debida proporcionalidad, medidas de resguardo inmediatas de NNA, gradualidad y plan de acompañamiento.
- Ley Aula Segura (Ley N° 21.128 que regula los casos de expulsión, suspensión provisoria inmediata y plazos fatales).
- Reglamento Interno de Convivencia Escolar (RICE / RIE) y las formalidades indispensables de proporcionalidad, gradualidad y acompañamiento formativo.

Tus respuestas deben estar redactadas en español formal de Chile, alineadas con el rigor burocrático y legal que evitará cargos, multas pecuniarias o recursos judiciales contra el colegio. Cita artículos cuando corresponda y explica paso a paso cómo resguardar el "Debido Proceso Escolar" y la integridad mediante medidas de resguardo. Proporciona respuestas muy estructuradas, didácticas y extremadamente precisas.`;

    const messages: { role: string; content: string }[] = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        const item = h as Record<string, unknown>;
        messages.push({
          role: item.role === 'user' ? 'user' : 'assistant',
          content: sanitizeForAI(item.content).slice(0, 2000),
        });
      }
    }
    messages.push({ role: 'user', content: sanitizeForAI(message) });

    const responseText = await callGroq(messages, systemInstruction);
    setCache(cacheKey, responseText);

    res.json({ success: true, reply: responseText });
  } catch (error: unknown) {
    console.error('Error en el Chat de Consultoría:', error);
    res.status(500).json({ error: 'Error al procesar su consulta legal.' });
  }
});

export default router;
