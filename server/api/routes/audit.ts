/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  isRequestValidationError,
  redactSensitiveForAI,
  requireStr,
  optStr,
  optArr,
} from '../validators/sanitizers.js';
import { callGeminiComplexGeneration } from '../services/gemini.js';
import { getRelevantLegalSources } from '../services/legalSources.js';
import { rateLimit } from '../../middleware/rateLimit.js';
import { requireMembership, CONVIVENCIA_MEMBERSHIP } from '../../middleware/requireMembership.js';

const router = Router();

router.post(
  '/audit-due-process',
  requireAuth,
  requireMembership(CONVIVENCIA_MEMBERSHIP),
  rateLimit,
  async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const id = requireStr(body, 'id', 50);
      const infractionType = requireStr(body, 'infractionType', 50);
      const isAulaSegura = Boolean(body.isAulaSegura);
      const checkedItems = optArr(body, 'checkedItems');
      const bitacora = optArr(body, 'bitacora');
      const observations = optStr(body, 'observations', 5000);
      const knownSensitiveValues = [id, infractionType, observations];

      const safeHistory = (bitacora as Array<Record<string, unknown>>)
        .map((entry) => ({
          title: redactSensitiveForAI(entry.titulo, knownSensitiveValues).slice(0, 200),
          date: redactSensitiveForAI(entry.fecha, knownSensitiveValues).slice(0, 50),
          type: redactSensitiveForAI(entry.tipo, knownSensitiveValues).slice(0, 80),
          description: redactSensitiveForAI(entry.descripcion, knownSensitiveValues).slice(
            0,
            2_000,
          ),
        }))
        .slice(0, 100);
      const legalSources = await getRelevantLegalSources(
        `debido proceso norma previa comunicación hechos indagación descargos resolución fundada proporcionalidad reconsideración ${infractionType}`,
      );

      const systemInstruction = `Eres un auditor documental de debido proceso en convivencia escolar chilena.

Tu función es verificar la coherencia entre los hitos efectivamente registrados en un expediente y siete garantías del debido proceso. No calificas la responsabilidad del estudiante, no propones sanciones, no estimas multas y no agregas exigencias que no se desprendan de las fuentes autorizadas.

Usa solo el expediente citado y las fuentes jurídicas autorizadas incluidas por el sistema. Redacta en español formal de Chile, con tono técnico, neutral y verificable.`;

      const auditDossier = `FUENTES JURÍDICAS AUTORIZADAS:
${legalSources}

EXPEDIENTE CITADO:
- Código: ${redactSensitiveForAI(id, knownSensitiveValues)}
- Materia registrada: ${redactSensitiveForAI(infractionType, knownSensitiveValues)}
- Referencia de procedimiento especial informada por el expediente: ${isAulaSegura ? 'Sí' : 'No'}
- Checklist registrado: ${redactSensitiveForAI(JSON.stringify(checkedItems, null, 2), knownSensitiveValues)}
- Hitos registrados: ${JSON.stringify(safeHistory, null, 2)}
- Observaciones: ${redactSensitiveForAI(observations, knownSensitiveValues)}

Evalúa exclusivamente estas garantías:
1. Existencia de una norma previa.
2. Comunicación de los hechos.
3. Indagación.
4. Oportunidad de presentar descargos.
5. Resolución fundada.
6. Proporcionalidad.
7. Derecho a solicitar reconsideración.

Para cada garantía usa solo uno de estos estados: **Acreditado**, **Pendiente** o **No verificable con el expediente disponible**. No infieras que está cumplida solo por el nombre de una fase o de un checklist; identifica el hito o documento que la respalda.

Devuelve Markdown con esta estructura exacta:
# Auditoría de debido proceso
## Matriz de garantías
Una tabla con: Garantía | Estado | Evidencia registrada | Brecha o acción documental pendiente.
## Secuencia de hitos
Explica brevemente si el orden documentado es coherente y qué antecedente falta registrar, si corresponde.
## Fuentes consideradas
Lista solo los archivos y secciones de las fuentes autorizadas que efectivamente utilizaste.

No cites normas externas, no inventes plazos y no agregues explicaciones fuera de esta estructura.`;

      const responseText = await callGeminiComplexGeneration(systemInstruction, auditDossier, {
        maxOutputTokens: 3_200,
        timeoutMs: 18_000,
      });
      res.json({ success: true, report: responseText, provider: 'Gemini' });
    } catch (error) {
      if (isRequestValidationError(error)) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error('Error al auditar debido proceso:', error);
      const message = error instanceof Error ? error.message : 'Error al contactar Gemini.';
      const status =
        message.includes('generativelanguage.googleapis.com') && message.includes('tiempo máximo')
          ? 504
          : 503;
      res.status(status).json({
        error:
          status === 504
            ? 'Gemini tardó más de lo esperado al generar la auditoría. Intente nuevamente.'
            : 'Gemini no está disponible para generar la auditoría. Revise GEMINI_API_KEY y LEGAL_DRAFT_MODEL en Vercel.',
        provider: 'Gemini',
      });
    }
  },
);

export default router;
