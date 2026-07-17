/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeForAI, requireStr, optStr, optArr } from '../validators/sanitizers.js';
import { checkRateLimit } from '../services/rateLimit.js';
import { callGroq } from '../services/groq.js';

const router = Router();

router.post('/audit-due-process', requireAuth, async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const id = requireStr(body, 'id', 50);
    const infractionType = requireStr(body, 'infractionType', 50);
    const isAulaSegura = Boolean(body.isAulaSegura);
    const checkedItems = optArr(body, 'checkedItems');
    const observations = optStr(body, 'observations', 5000);

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const systemPrompt = `Eres un Abogado Experto Legal en Educación Chilena y Fiscalizador de la Superintendencia de Educación, especializado en la Circular N° 482 y Ley N° 21809 de la Superintendencia de Educación (reglamentación de convivencia escolar, debido proceso y medidas de resguardo de NNA) y en la Ley de Aula Segura (Ley 21.128). 
Tu misión es auditar un caso de convivencia escolar de un colegio chileno para asegurar su indemnidad jurídica frente a un posible reclamo o recurso ante la Supereduc o tribunales. Exige siempre el cumplimiento del Debido Proceso (etapas: Recepción → Comunicación/Notificación → Investigación → Resolución Fundada → Reconsideración/Apelación) y la adopción prioritaria de Medidas de Resguardo Inmediatas para salvaguardar la integridad de los menores involucrados.

Analiza rigurosamente los siguientes detalles:
- Código de causa: ${id}
- Tipo de Infracción: ${infractionType} (bajo Reglamento Interno de Convivencia Escolar / RIE)
- Enfoque de Ley de Aula Segura: ${isAulaSegura ? 'Sí (Sometido a Ley Aula Segura - Suspensión provisoria, plazo fatal de 10 días hábiles de resolución)' : 'No (Procedimiento ordinario según RIE, Circular 482 y Ley 21809)'}
- Checklists de Medidas de Resguardo Inmediatas Adoptadas (Circular 482 / Ley 21809):
${JSON.stringify(checkedItems, null, 2)}
- Observaciones:
"${sanitizeForAI(observations)}"

Escribe un análisis de auditoría en formato de informe técnico formal en Markdown que incluya:
1. **Índice o Semáforo Jurídico de Cumplimiento**: Porcentaje estimado de validez procesal actual (e.g. 70% / Riesgo Medio).
2. **Diagnóstico del Proceso y Medidas de Resguardo**: Análisis puntual del cumplimiento de las etapas del RIE y la suficiencia de las medidas de resguardo inmediatas de protección aplicadas al NNA.
3. **Brechas y Omisiones Críticas (Riesgo Legal ante Supereduc)**: Qué falta, qué se omitió (por ejemplo, si falta dupla psicosocial o plan pedagógico para casos graves) y qué multas arriesga el colegio (e.g., multas UTM al sostenedor por faltas al debido proceso o abandono de medidas de resguardo).
4. **Instrucciones Remediales**: Pasos obligatorios urgentes de resguardo y tramitación para sanear el caso, junto con los plazos reglamentarios vigentes.

Utiliza un tono sumamente profesional, corporativo, técnico e institucional (el "vibe" SaaS legal de alto nivel chileno).`;

    const responseText = await callGroq([{ role: 'user', content: systemPrompt }]);
    res.json({ success: true, report: responseText });
  } catch (error) {
    console.error('Error al auditar debido proceso:', error);
    const status = (error as Error).message?.startsWith('Campo requerido') ? 400 : 500;
    res.status(status).json({ error: 'Error interno del servidor en auditoría.' });
  }
});

export default router;
