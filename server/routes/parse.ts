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

    const MAX_LENGTH = 80000;
    if (cleanText.length > MAX_LENGTH) {
      cleanText = cleanText.slice(0, MAX_LENGTH) + '\n\n[Documento truncado por exceder el límite de procesamiento]';
      console.warn(`Texto truncado de ${textContent.length} a ${MAX_LENGTH} caracteres`);
    }

    const systemInstruction = `Eres un analizador de documentos educativos. Tu tarea es extraer TODAS las anotaciones de un texto de hoja de vida estudiantil y devolverlas en JSON.

CADA ANOTACIÓN tiene esta estructura (en una sola línea o bloque contiguo):
[FECHA] Profesor: [nombre] Tipo: [tipo] Categoria: [categoría] Anotación: [descripción]

Orden exacto de los campos:
1. FECHA al inicio, formato DD/MM/AAAA.
2. Profesor: nombre del profesor.
3. Tipo: SOLO puede ser "Información", "Positiva" o "Negativa".
4. Categoria: INFORMACIÓN, COMPORTAMIENTO, RESPONSABILIDAD o RESPONSABILIDAD Y COMPORTAMIENTO.
5. Anotación: texto descriptivo del evento.

REGLAS:
- Cada línea que empieza con una fecha (DD/MM/AAAA) es UNA anotación.
- Si una anotación no cabe en una línea, el texto continúa en la siguiente hasta la próxima fecha.
- NO dividas una anotación en múltiples registros.
- NO incluyas encabezados, títulos de sección ni líneas sin fecha.
- NO inventes información que no esté en el texto.

Campos JSON requeridos:
- text: texto completo de la anotación.
- date: fecha en formato YYYY-MM-DD.
- registered_by: nombre del profesor. Si no hay, usa "Inspectoría".
- type: exactamente el valor del campo Tipo. "Información" NO es negativa, es neutra.

Devuelve SOLO el arreglo JSON, sin texto adicional.`;

    const messages = [
      {
        role: 'user' as const,
        content: `Extrae TODAS las anotaciones del siguiente texto de hoja de vida. Cada línea que empieza con fecha (DD/MM/AAAA) es UNA anotación. Devuelve SOLO el JSON:\n\n--- INICIO DEL DOCUMENTO ---\n${cleanText}\n--- FIN DEL DOCUMENTO ---`,
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
