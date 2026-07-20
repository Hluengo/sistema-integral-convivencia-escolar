/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { checkRateLimit } from '../lib/rateLimit';
import { callGroq } from '../lib/groq';


const router = Router();

router.post('/parse-annotations', async (req, res) => {
  try {
    const { textContent } = req.body as Record<string, string | undefined>;

    if (!textContent || !textContent.trim()) {
      res.status(400).json({ error: 'No se recibió el texto extraído del PDF.' });
      return;
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      res
        .status(429)
        .json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    let cleanText = textContent
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{3,}/g, '  ')
      .replace(/Página\s*\d+.*/gi, '')
      .replace(/^\s*[-•·]\s*/gm, '')
      .trim();

    const systemInstruction = `Eres un asistente experto de Convivencia Escolar en Chile.
Analiza el texto de una hoja de vida y extrae TODAS las anotaciones en JSON.

Campos requeridos: text, date (YYYY-MM-DD), registered_by, type (Positiva|Negativa).

Si no figura registered_by usa "Inspectoría".
Devuelve SOLO el arreglo JSON, sin texto adicional.`;

    const messages = [
      {
        role: 'user' as const,
        content: `A continuación está el texto completo extraído de la hoja de vida del estudiante. Extrae TODAS las anotaciones de conducta (tanto positivas como negativas) en formato JSON:\n\n--- INICIO DEL DOCUMENTO ---\n${cleanText}\n--- FIN DEL DOCUMENTO ---`,
      },
    ];

    const responseText = await callGroq(messages, systemInstruction);

    let annotations: Array<Record<string, unknown>> = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        annotations = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing Groq response as JSON:', parseError);
    }

    res.json({ success: true, annotations });
  } catch (error) {
    console.error('Error al analizar documento:', error);
    res.status(500).json({ error: 'Error interno al procesar el archivo.' });
  }
});

export default router;
