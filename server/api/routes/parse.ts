/** @license SPDX-License-Identifier: Apache-2.0 */

import { Router } from 'express';
import { checkRateLimit } from '../services/rateLimit.js';
import { callGroq } from '../services/groq.js';


const router = Router();

router.post('/parse-annotations', async (req, res) => {
  try {
    const { textContent } = req.body as {
      textContent?: string;
      fileName?: string;
      studentId?: string;
    };

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
Analiza el texto de una hoja de vida estudiantil y extrae TODAS las anotaciones en JSON.

CADA ANOTACIÓN en la hoja de vida tiene esta estructura de bloque:
[Fecha] Tipo: Positiva, Negativa o Información
Categoria: [categoría]
Anotación:
[texto del evento, puede ocupar varias líneas]
Profesor: [nombre del profesor]

CADA bloque fecha+tipo+categoría+texto+profesor = UNA anotación.
NO dividas un bloque en múltiples anotaciones.
NO incluyas encabezados, títulos, resúmenes, totales o líneas sueltas como anotaciones.
NO inventes información que no esté en el texto.

Campos requeridos para cada anotación:
- text: TODO el texto del evento (líneas después de "Anotación:" hasta antes de "Profesor:").
- date: fecha en formato YYYY-MM-DD (primer token del bloque).
- registered_by: el nombre después de "Profesor:" en cada bloque. Si no hay usa "Inspectoría".
- type: exactamente "Positiva", "Negativa" o "Información", según el texto "Tipo:" en el bloque. Las anotaciones de tipo "Información" son neutras (no son ni positivas ni negativas).

Devuelve SOLO el arreglo JSON, sin texto adicional.`;

    const messages = [
      {
        role: 'user' as const,
        content: `Extrae TODAS las anotaciones del siguiente texto de hoja de vida. Cada bloque fecha+tipo+categoría+texto+profesor es UNA anotación. Respeta esa estructura. Devuelve SOLO el JSON:\n\n--- INICIO DEL DOCUMENTO ---\n${cleanText}\n--- FIN DEL DOCUMENTO ---`,
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
