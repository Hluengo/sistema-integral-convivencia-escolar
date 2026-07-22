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
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    let cleanText = textContent
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{3,}/g, '  ')
      .replace(/Página\s*\d+.*/gi, '')
      .trim();

    const systemInstruction = `Analiza un documento de hoja de vida estudiantil. Cuenta cuántas anotaciones hay de cada Tipo: "Positiva", "Negativa" o "Información". Devuelve SOLO un JSON con los conteos: {"negativas": N, "positivas": N, "informativas": N}.`;

    const messages = [
      {
        role: 'user' as const,
        content: `Analiza el siguiente texto de hoja de vida y cuenta las anotaciones por tipo:\n\n--- INICIO ---\n${cleanText}\n--- FIN ---`,
      },
    ];

    const responseText = await callGroq(messages, systemInstruction);

    let summary = { negativas: 0, positivas: 0, informativas: 0 };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        summary = {
          negativas: Number(parsed.negativas) || 0,
          positivas: Number(parsed.positivas) || 0,
          informativas: Number(parsed.informativas) || 0,
        };
      }
    } catch (parseError) {
      console.error('Error parsing Groq response as JSON:', parseError);
    }

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error al analizar documento:', error);
    res.status(500).json({ error: 'Error interno al procesar el archivo.' });
  }
});

export default router;
