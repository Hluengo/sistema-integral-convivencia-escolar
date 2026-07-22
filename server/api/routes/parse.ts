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
      .split('\n')
      .filter((l) => !l.trim().startsWith('![') && !l.includes('data:image'))
      .join('\n')
      .replace(/^!\[.*$[\r\n]*/gm, '')
      .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{3,}/g, '  ')
      .replace(/Página\s*\d+.*/gi, '')
      .trim();

    const systemInstruction = `Eres un analizador de hojas de vida escolares. Cuenta las anotaciones clasificándolas SOLO por el campo "Tipo". Los valores válidos son: "Positiva" (elogios, felicitaciones, logros), "Negativa" (faltas, sanciones, observaciones disciplinarias), "Información" (datos neutros, comunicaciones, citaciones sin sanción). Ignora líneas sin Tipo. Si el Tipo no es claro, asigna "Información". Cuenta CADA anotación individual. Devuelve SOLO: {"negativas": N, "positivas": N, "informativas": N}.`;

    const messages = [
      {
        role: 'user' as const,
        content: `Cuenta las anotaciones por Tipo del siguiente texto:\n\n--- INICIO ---\n${cleanText}\n--- FIN ---`,
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
