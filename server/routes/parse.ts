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
      .trim();

    const systemInstruction = `Eres un asistente experto de Convivencia Escolar en Chile.
Analiza el texto extraído de una hoja de vida estudiantil y extrae TODAS las anotaciones en JSON.

CADA ANOTACIÓN es una entrada independiente en el listado (usualmente una fila o un párrafo separado por bullet).
NO dividas una anotación en múltiples entradas.
NO incluyas encabezados, títulos, resúmenes, totales, sumarios o líneas de formato como anotaciones.
NO inventes ni dupliques información que no esté explícitamente en el texto.

Campos requeridos para cada anotación:
- text: descripción completa de la anotación (texto del evento).
- date: fecha en formato YYYY-MM-DD. Si no hay fecha usa null.
- registered_by: responsable que registró. Si no figura usa "Inspectoría".
- type: exactamente "Positiva" para logros, reconocimientos, buena conducta, méritos;
        exactamente "Negativa" para atrasos, mala conducta, incumplimientos, faltas, llamados de atención.
- severity: para anotaciones Negativas: "Leve", "Grave", "Muy Grave" o "Gravísima" según la gravedad de la falta;
            para anotaciones Positivas usa null.

Devuelve SOLO el arreglo JSON, sin texto adicional.`;

    const messages = [
      {
        role: 'user' as const,
        content: `Extrae TODAS las anotaciones del siguiente texto de hoja de vida. Respeta estrictamente la estructura del documento: cada entrada independiente (fila o bullet) es UNA anotación. Devuelve SOLO el JSON:\n\n--- INICIO DEL DOCUMENTO ---\n${cleanText}\n--- FIN DEL DOCUMENTO ---`,
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
