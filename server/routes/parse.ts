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

    const MAX_LENGTH = 25000;
    if (cleanText.length > MAX_LENGTH) {
      cleanText = cleanText.slice(0, MAX_LENGTH) + '\n\n[Documento truncado por exceder el límite de procesamiento]';
      console.warn(`Texto truncado de ${textContent.length} a ${MAX_LENGTH} caracteres`);
    }

    const systemInstruction = `Extrae TODAS las anotaciones de este texto de hoja de vida estudiantil. Cada línea que empieza con fecha DD/MM/AAAA es una anotación distinta.

Formato esperado: [FECHA] Profesor: [nombre] Tipo: [Información|Positiva|Negativa] Categoria: [categoría] Anotación: [descripción]

Devuelve SOLO un array JSON con estos campos:
- text: descripción completa
- date: YYYY-MM-DD
- registered_by: nombre del profesor o "Inspectoría"
- type: "Información", "Positiva" o "Negativa"

No inventes anotaciones. Devuelve SOLO el JSON, sin explicaciones.`;

    const messages = [
      {
        role: 'user' as const,
        content: `Extrae TODAS las anotaciones:\n\n${cleanText}`,
      },
    ];

    const responseText = await callGroq(messages, systemInstruction).catch(err => {
      console.error('Groq API error:', (err as Error).message);
      throw new Error('El servicio de IA no pudo procesar el documento. Si el PDF es escaneado o tiene imágenes, conviértelo a texto primero.');
    });

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
    const msg = error instanceof Error ? error.message : 'Error interno al procesar el archivo.';
    res.status(500).json({ error: msg });
  }
});

export default router;
