/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { checkRateLimit } from '../lib/rateLimit';

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

    const lines = textContent
      .split('\n')
      .filter((l) => !l.trim().startsWith('![') && !l.includes('data:image'));

    const blocks: string[] = [];
    let current: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
        if (current.length > 0) blocks.push(current.join('\n'));
        current = [line];
      } else if (current.length > 0) {
        current.push(line);
      }
    }
    if (current.length > 0) blocks.push(current.join('\n'));

    const summary = { negativas: 0, positivas: 0, informativas: 0 };
    for (const block of blocks) {
      const m = block.match(/Tipo:\s*(Negativa|Positiva|Informaci[oó]n)/i);
      if (m) {
        const t = m[1].toLowerCase();
        if (t.startsWith('neg')) summary.negativas++;
        else if (t.startsWith('pos')) summary.positivas++;
        else summary.informativas++;
      }
    }

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error al analizar documento:', error);
    res.status(500).json({ error: 'Error interno al procesar el archivo.' });
  }
});

export default router;
