/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { checkRateLimit } from '../lib/rateLimit';
import { callGroq } from '../lib/groq';
import pdfParse from 'pdf-parse';

const router = Router();

router.post('/parse-annotations', async (req, res) => {
  try {
    const { fileData, base64Data, mimeType } = req.body as Record<string, string | undefined>;

    const b64 = fileData || base64Data;
    if (!b64) {
      res.status(400).json({ error: 'Faltan los datos del archivo en formato base64.' });
      return;
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      res
        .status(429)
        .json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
      return;
    }

    const buffer = Buffer.from(b64, 'base64');
    let textContent = '';

    try {
      const pdfData = await pdfParse(buffer);
      textContent = pdfData.text || '';
    } catch {
      res.status(400).json({ error: 'No se pudo leer el PDF. Asegúrate de que sea un archivo PDF válido con texto seleccionable.' });
      return;
    }

    if (!textContent.trim()) {
      res.status(400).json({ error: 'El PDF no contiene texto seleccionable. Escanea el documento con OCR o usa un PDF con texto digital.' });
      return;
    }

    const systemInstruction = `Eres un asistente experto de Convivencia Escolar en Chile, alineado al Reglamento Interno de Convivencia Escolar (RICE) 2026. Analiza el texto extraído de la hoja de vida de un estudiante y extrae TODAS las anotaciones o registros de conducta, reconociendo tanto las anotaciones NEGATIVAS como las POSITIVAS.

Clasifica la gravedad de forma rigurosa de acuerdo a las pautas del RICE 2026:
- 'Leve' (Art. 24): Atrasos, uniforme incompleto, deficiencia de higiene, no entregar circulares, interrumpir clases, comer en el aula, etc.
- 'Grave' (Art. 25): Faltar a la verdad, usar celular sin autorizacion en clases, promover disturbios, lenguaje vulgar u ofensivo, copia o fraude academico.
- 'Muy Grave' (Art. 26): Falsificar firmas, destruir bienes del colegio, participar en riñas, ciberacoso, deepfakes, etc.
- 'Gravísima' (Art. 27 - Aula Segura): Agresion fisica severa, porte/uso de armas o artefactos explosivos (incluye encender fuego), drogas/alcohol, acoso o abuso sexual.

Para cada anotacion identificada, estructura la informacion como un arreglo JSON con los siguientes campos:
1. "text": Descripcion del hecho de forma clara y literal.
2. "date": Fecha en formato 'YYYY-MM-DD'. Si solo indica dia/mes, asume el año 2026.
3. "severity": Gravedad clasificada como 'Leve', 'Grave', 'Muy Grave' o 'Gravísima'. Si es positiva, asignale 'Leve'.
4. "registered_by": Persona que registro la observacion. Si no figura, escribe "Inspectoría".
5. "type": 'Positiva' o 'Negativa'.

Devuelve estrictamente SOLO un arreglo JSON con TODAS las anotaciones encontradas. No incluyas texto adicional fuera del JSON.`;

    const messages = [
      {
        role: 'user' as const,
        content: `A continuación está el texto completo extraído de la hoja de vida del estudiante. Extrae TODAS las anotaciones de conducta (tanto positivas como negativas) en formato JSON:\n\n--- INICIO DEL DOCUMENTO ---\n${textContent}\n--- FIN DEL DOCUMENTO ---`,
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
