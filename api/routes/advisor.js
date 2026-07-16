import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeForAI } from '../lib/validators.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { getCacheKey, getFromCache, setCache } from '../lib/cache.js';
import { callGroq } from '../lib/groq.js';

const router = Router();

router.post('/advisor-chat', requireAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Campo requerido: message' });
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res
        .status(429)
        .json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
    }

    const systemInstruction = `Actúas como un Abogado Senior y Experto Legal de la Superintendencia de Educación de Chile, experto en fiscalizaciones aplicadas a establecimientos escolares chilenos. Tu dominio de especialidad abarca:
- Circular N° 482 de la Superintendencia de Educación y la Ley N° 21809, que norman reglamentos internos de convivencia escolar (RIE), debida proporcionalidad, medidas de resguardo inmediatas de NNA, gradualidad y plan de acompañamiento.
- Ley Aula Segura (Ley N° 21.128 que regula los casos de expulsión, suspensión provisoria inmediata y plazos fatales).
- Reglamento Interno de Convivencia Escolar (RICE / RIE) y las formalidades indispensables de proporcionalidad, gradualidad y acompañamiento formativo.

Tus respuestas deben estar redactadas en español formal de Chile, alineadas con el rigor burocrático y legal que evitará cargos, multas pecuniarias o recursos judiciales contra el colegio. Cita artículos cuando corresponda y explica paso a paso cómo resguardar el "Debido Proceso Escolar" y la integridad mediante medidas de resguardo. Proporciona respuestas muy estructuradas, didácticas y extremadamente precisas.`;

    const userId = req.user?.sub || 'anonymous';
    const cacheKey = getCacheKey('advisor-chat', {
      userId,
      message,
      historyCount: history?.length || 0,
    });
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ success: true, reply: cached, cached: true });
    }

    const messages = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: sanitizeForAI(h.content),
        });
      }
    }
    messages.push({ role: 'user', content: sanitizeForAI(message) });
    const reply = await callGroq(messages, systemInstruction);
    setCache(cacheKey, reply);
    res.json({ success: true, reply });
  } catch (error) {
    console.error('Error en el Chat de Consultoría:', error.message || error);
    const detail = error.message?.includes('GROQ_API_KEY')
      ? 'API key de Groq no configurada en variables de entorno de Vercel.'
      : error.message?.includes('Groq API error')
        ? `Error de Groq: ${error.message}`
        : 'Error interno del servidor.';
    res.status(500).json({ error: detail });
  }
});

export default router;
