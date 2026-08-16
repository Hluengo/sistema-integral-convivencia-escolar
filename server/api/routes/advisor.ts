/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { redactSensitiveForAI } from '../validators/sanitizers.js';
import { getCacheKey, getFromCache, setCache } from '../services/cache.js';
import { callOpenRouter } from '../services/openrouter.js';
import { getRelevantLegalSources } from '../services/legalSources.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireMembership, CONVIVENCIA_MEMBERSHIP } from '../../middleware/requireMembership.js';

const router = Router();

const MAX_ADVISOR_MESSAGE_LENGTH = 8_000;
export const MAX_HISTORY_MESSAGES = 8;
export const MAX_HISTORY_MESSAGE_LENGTH = 4_000;
export const MAX_HISTORY_TOTAL_LENGTH = 16_000;

type AdvisorMessage = { role: 'user' | 'assistant'; content: string };

export function normalizeHistory(value: unknown): AdvisorMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_HISTORY_MESSAGES) return null;

  let totalLength = 0;
  const normalized: AdvisorMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const record = item as { role?: unknown; content?: unknown };
    if (typeof record.content !== 'string' || record.content.length > MAX_HISTORY_MESSAGE_LENGTH) {
      return null;
    }
    const content = redactSensitiveForAI(record.content).trim();
    if (!content) return null;
    totalLength += content.length;
    if (totalLength > MAX_HISTORY_TOTAL_LENGTH) return null;
    normalized.push({ role: record.role === 'user' ? 'user' : 'assistant', content });
  }
  return normalized;
}

router.post(
  '/advisor-chat',
  requireAuth,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  rateLimit,
  async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Campo requerido: message' });
        return;
      }

      if (message.length > MAX_ADVISOR_MESSAGE_LENGTH) {
        res.status(400).json({ error: 'El mensaje supera el máximo permitido.' });
        return;
      }
      const normalizedHistory = normalizeHistory(history);
      if (!normalizedHistory) {
        res.status(400).json({
          error: 'El historial de consulta no es válido o supera el máximo permitido.',
        });
        return;
      }

      const safeMessage = redactSensitiveForAI(message);
      const legalSources = await getRelevantLegalSources(safeMessage);
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
        message: safeMessage,
        history: normalizedHistory,
      });
      const cached = getFromCache(cacheKey);
      if (cached) {
        res.json({ success: true, reply: cached, cached: true });
        return;
      }

      const messages: Array<{ role: string; content: string }> = [...normalizedHistory];
      messages.push({ role: 'user', content: safeMessage });
      const reply = await callOpenRouter(messages, systemInstruction);
      setCache(cacheKey, reply);
      res.json({ success: true, reply });
    } catch (error) {
      console.error('Error en el Chat de Consultoría:', (error as Error).message || error);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  },
);

export default router;
