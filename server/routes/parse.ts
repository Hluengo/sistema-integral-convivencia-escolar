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
      res.status(429).json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    let cleanText = textContent
      .split('\n')
      .filter((l) => !l.trim().startsWith('![') && !l.includes('data:image'))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{3,}/g, '  ')
      .replace(/Página\s*\d+.*/gi, '')
      .trim();

    const lines = cleanText.split('\n');
    const blocks: string[] = [];
    let current: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('![') || trimmed.includes('data:image')) continue;
      if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
        if (current.length > 0) blocks.push(current.join('\n'));
        current = [line];
      } else if (current.length > 0 && trimmed) {
        current.push(line);
      }
    }
    if (current.length > 0) blocks.push(current.join('\n'));
    let filteredText = blocks.join('\n\n');

    const MAX_LENGTH = 10000;
    if (filteredText.length > MAX_LENGTH) {
      filteredText = filteredText.slice(0, MAX_LENGTH) + '\n\n[Truncado]';
    }

    const systemInstruction = `Eres un analizador de hojas de vida escolares. Cuenta las anotaciones clasificándolas SOLO por el campo "Tipo". Los valores válidos son: "Positiva" (elogios, felicitaciones, logros), "Negativa" (faltas, sanciones, observaciones disciplinarias), "Información" (datos neutros, comunicaciones, citaciones sin sanción). Ignora líneas sin Tipo. Si el Tipo no es claro, asigna "Información". Cuenta CADA anotación individual. Devuelve SOLO: {"negativas": N, "positivas": N, "informativas": N}.`;

    const messages = [
      {
        role: 'user' as const,
        content:
          filteredText.length > 0
            ? `Cuenta anotaciones por Tipo:\n\n${filteredText}`
            : `Cuenta anotaciones por Tipo:\n\n${cleanText}`,
      },
    ];

    const responseText = await callGroq(messages, systemInstruction).catch((err) => {
      console.error('Groq API error:', (err as Error).message);
      throw new Error(
        'El servicio de IA no pudo procesar el documento. Si el PDF es escaneado o tiene imágenes, conviértelo a texto primero.'
      );
    });

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
    const msg = error instanceof Error ? error.message : 'Error interno al procesar el archivo.';
    res.status(500).json({ error: msg });
  }
});

export default router;
