import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkRateLimit } from '../lib/rateLimit.js';
import { callGroq } from '../lib/groq.js';

const router = Router();

router.post('/parse-annotations', requireAuth, async (req, res) => {
  try {
    const { base64Data, mimeType, fileName: _fileName } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'Faltan los datos del archivo en formato base64.' });
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return res
        .status(429)
        .json({ error: 'Límite de solicitudes alcanzado. Intente en un minuto.' });
    }

    const imageUrl = `data:${mimeType || 'application/pdf'};base64,${base64Data}`;

    const systemInstruction = `Eres un asistente experto de Convivencia Escolar en Chile, alineado al Reglamento Interno de Convivencia Escolar (RICE) 2026. Analiza el documento del estudiante y extrae TODAS las anotaciones o registros de conducta, reconociendo tanto las anotaciones NEGATIVAS (atrasos, uniforme, faltas disciplinarias) como las POSITIVAS (felicitaciones, meritos academicos).

Clasifica la gravedad de forma rigurosa de acuerdo a las pautas del RICE 2026:
- 'Leve' (Art. 24): Atrasos, uniforme incompleto, deficiencia de higiene, no entregar circulares, interrumpir clases, comer en el aula, etc.
- 'Grave' (Art. 25): Faltar a la verdad, usar celular sin autorizacion en clases, promover disturbios, lenguaje vulgar u ofensivo, copia o fraude academico.
- 'Muy Grave' (Art. 26): Falsificar firmas, destruir bienes del colegio, participar en riñas, ciberacoso, deepfakes, etc.
- 'Gravísima' (Art. 27 - Aula Segura): Agresion fisica severa, porte/uso de armas o artefactos explosivos (incluye encender fuego), drogas/alcohol, acoso o abuso sexual.

Para cada anotacion identificada, estructura la informacion como un arreglo JSON con los siguientes campos:
1. "text": Breve descripcion del hecho de la anotacion de forma clara y literal.
2. "date": Fecha en formato 'YYYY-MM-DD'. Si solo indica dia/mes, asume el año 2026.
3. "severity": Gravedad de la anotacion, clasificada estrictamente como 'Leve', 'Grave', 'Muy Grave' o 'Gravísima'. Si es positiva, asignale siempre 'Leve'.
4. "registered_by": Persona que registró la observacion. Si no figura, escribe "Inspectoría".
5. "type": Tipo de anotacion, clasificada estrictamente como 'Positiva' o 'Negativa'.

Devuelve estrictamente un arreglo JSON que contenga las anotaciones del estudiante ordenadas cronologicamente.`;

    const messages = [
      {
        role: 'user',
        content: `Analiza la siguiente hoja de vida de estudiante y extrae todas las anotaciones en formato JSON:\n\nImagen del documento: ${imageUrl.substring(0, 500)}...`,
      },
    ];

    const responseText = await callGroq(messages, systemInstruction);

    let annotations = [];
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
